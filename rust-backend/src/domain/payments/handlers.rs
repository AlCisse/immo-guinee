//! Payments (US4 — commission + escrow). **Sandbox provider**: the Orange Money /
//! MTN MoMo call is simulated (instant confirmation + external ref) until real
//! merchant credentials are wired. The escrow/commission state machine is real:
//! the tenant pays deposit + platform commission; the deposit is held in escrow
//! and released to the owner on their confirmation, when a quittance PDF is issued.

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter, QueryOrder,
    TransactionTrait,
};
use serde_json::{Value, json};
use uuid::Uuid;

use crate::auth::rbac::Permission;
use crate::db::entities::sea_orm_active_enums::{
    MethodePaiement, StatutContrat, StatutPaiement, StatutTransaction, TypeOperation, TypePaiement,
};
use crate::db::entities::{admin_audit_log, contract, listing, payment, transaction, user};
use crate::error::{AppError, AppResult};
use crate::extractors::{AuthUser, ValidatedJson};
use crate::middleware::rate_limit;
use crate::services::pdf;
use crate::state::AppState;

use super::dto::{
    Invoice, InitiateRequest, ProcessRequest, RefundRequest, ValidateRequest, fmt_gnf,
    invoice_json, parse_methode, payment_json,
};
use super::reference_paiement_for;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/payments", get(list).post(process))
        .route("/payments/initiate", post(initiate))
        .route("/payments/pending-invoices", get(pending_invoices))
        .route("/payments/cash", post(cash))
        .route("/payments/{id}", get(show))
        .route("/payments/{id}/status", get(status))
        .route("/payments/{id}/validate", post(validate))
        .route("/payments/{id}/refund", post(refund))
}

/// `POST /api/payments/initiate` — the invoice for a signed contract (no side effect).
async fn initiate(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<InitiateRequest>,
) -> AppResult<Json<Value>> {
    let c = fetch_payable_contract(&state, &auth, req.contract_id).await?;
    let inv = Invoice::from_contract(&c);
    Ok(Json(json!({ "success": true, "data": invoice_json(&c, &inv) })))
}

/// `POST /api/payments` — pay the invoice (sandbox provider). Deposit goes to
/// escrow, the platform commission is collected immediately.
async fn process(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<ProcessRequest>,
) -> AppResult<Json<Value>> {
    rate_limit::limit_payment(&state.redis, auth.id).await?;
    let c = fetch_payable_contract(&state, &auth, req.contract_id).await?;

    // One active payment per contract.
    assert_no_active_payment(&state, c.id).await?;

    let inv = Invoice::from_contract(&c);

    // FR-045: 2FA (TOTP) required for payments > 500 000 GNF.
    if inv.total > 500_000 {
        let payer = user::Entity::find_by_id(auth.id)
            .one(&state.db)
            .await?
            .ok_or(AppError::Unauthorized)?;
        let secret = payer.two_factor_secret.as_ref().ok_or_else(|| {
            AppError::Forbidden(
                "2FA requise pour les paiements > 500 000 GNF — activez la 2FA sur votre compte".into(),
            )
        })?;
        let code = req
            .totp_code
            .as_ref()
            .ok_or_else(|| AppError::Validation("code TOTP requis (paiement > 500 000 GNF)".into()))?;
        if !crate::auth::totp::verify(secret, &payer.telephone, code)? {
            return Err(AppError::Validation("Code TOTP incorrect".into()));
        }
    }

    let methode = parse_methode(&req.methode_paiement);
    let now = Utc::now();

    // --- SANDBOX: simulate the mobile-money provider (instant success). ---
    let external_ref = sandbox_provider_ref(&methode);

    let id = Uuid::new_v4();
    // Atomic: the payment and its escrow transaction commit together so a mid-flow
    // DB failure cannot leave an escrowed payment without a transaction record
    // (which would block the owner's `validate` from closing the escrow).
    let payeur_id = auth.id;
    let beneficiaire_id = c.proprietaire_id;
    let contrat_id = c.id;
    let annonce_id = c.annonce_id;
    let caution = inv.caution;
    let commission = inv.commission;
    let total = inv.total;
    let pay = state
        .db
        .transaction::<_, payment::Model, AppError>(|txn| {
            Box::pin(async move {
                let pay = match (payment::ActiveModel {
                    id: Set(id),
                    payeur_id: Set(payeur_id),
                    beneficiaire_id: Set(beneficiaire_id),
                    contrat_id: Set(Some(contrat_id)),
                    type_paiement: Set(TypePaiement::Caution),
                    montant_gnf: Set(caution),
                    commission_plateforme_gnf: Set(commission),
                    montant_total_gnf: Set(total),
                    methode_paiement: Set(methode),
                    // Deposit escrowed, commission collected — both happen at confirmation.
                    statut: Set(StatutPaiement::EnEscrow),
                    numero_transaction_externe: Set(Some(external_ref)),
                    tentatives_paiement: Set(1),
                    date_creation: Set(now.into()),
                    date_confirmation: Set(Some(now.into())),
                    ..Default::default()
                }
                .insert(txn)
                .await)
                {
                    Ok(p) => p,
                    // Race: a concurrent process/cash won the partial-unique index
                    // (uq_payments_contrat_active). Roll back and surface a 409.
                    Err(e) if is_unique_violation(&e) => {
                        return Err(AppError::Conflict("un paiement existe déjà pour ce contrat".into()));
                    }
                    Err(e) => return Err(AppError::Database(e)),
                };

                // Open (or reset, on a retry after refund) the escrow transaction in
                // the same atomic unit as the payment.
                upsert_escrow_transaction(
                    txn, annonce_id, beneficiaire_id, payeur_id, contrat_id, pay.id, total, commission, now,
                )
                .await?;

                Ok(pay)
            })
        })
        .await
        .map_err(|e| match e {
            sea_orm::TransactionError::Connection(db) => AppError::Database(db),
            sea_orm::TransactionError::Transaction(app) => app,
        })?;

    let listing = load_listing(&state, c.annonce_id).await?;
    let beneficiaire = user::Entity::find_by_id(c.proprietaire_id).one(&state.db).await?;
    Ok(Json(json!({
        "success": true,
        "data": { "payment": payment_json(&pay, Some(&c), listing.as_ref(), beneficiaire.as_ref()) }
    })))
}

/// `POST /api/payments/{id}/validate` — owner confirms reception: release escrow,
/// issue the quittance PDF, complete the transaction.
async fn validate(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<ValidateRequest>,
) -> AppResult<Json<Value>> {
    rate_limit::limit_payment(&state.redis, auth.id).await?;
    let p = payment::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;
    if p.beneficiaire_id != auth.id {
        return Err(AppError::Forbidden("seul le bénéficiaire peut valider ce paiement".into()));
    }
    if !req.validated {
        return Ok(Json(json!({ "success": true, "data": { "payment": payment_json(&p, None, None, None) } })));
    }

    // Fetch the parties (for the quittance source) — no state change yet.
    let payeur = user::Entity::find_by_id(p.payeur_id).one(&state.db).await?;
    let beneficiaire = user::Entity::find_by_id(p.beneficiaire_id).one(&state.db).await?;

    // Render + store the quittance FIRST (idempotent key, retryable). A failure here
    // leaves the payment in escrow so the owner can retry. Previously the statut was
    // flipped to Confirme BEFORE this step, so a render/put failure made the payment
    // unrecoverable (409 on retry, no quittance, transaction stuck EnCours).
    let quittance_url = match (&payeur, &beneficiaire) {
        (Some(pa), Some(be)) => {
            let src = quittance_source(&p, pa, be);
            let bytes = match tokio::task::spawn_blocking(move || pdf::render(src)).await {
                Ok(Ok(b)) => b,
                Ok(Err(e)) => return Err(e),
                Err(e) => return Err(AppError::Internal(anyhow::anyhow!("quittance render task: {e}"))),
            };
            let key = format!("quittances/{}.pdf", p.id);
            Some(state.storage.put(&key, &bytes, "application/pdf").await?)
        }
        _ => None,
    };

    // Atomic flip + quittance persist + escrow close, in ONE DB transaction. The
    // conditional UPDATE still guards double-release (only an escrow-held payment
    // can flip, only one concurrent validate wins); committing it together with the
    // quittance URL and the transaction close means a post-flip failure can no
    // longer leave the escrow released with no quittance and the transaction stuck.
    let now = Utc::now();
    let contrat_id = p.contrat_id;
    let updated = state
        .db
        .transaction::<_, payment::Model, AppError>(|txn| {
            Box::pin(async move {
                let result = payment::Entity::update_many()
                    .col_expr(payment::Column::Statut, statut_expr(StatutPaiement::Confirme))
                    .filter(payment::Column::Id.eq(id))
                    .filter(
                        payment::Column::Statut
                            .is_in([StatutPaiement::EnEscrow, StatutPaiement::CommissionCollectee]),
                    )
                    .exec(txn)
                    .await?;
                if result.rows_affected == 0 {
                    return Err(AppError::Conflict("paiement déjà validé ou non en séquestre".into()));
                }
                let p = payment::Entity::find_by_id(id).one(txn).await?.ok_or(AppError::NotFound)?;
                let mut am: payment::ActiveModel = p.into();
                am.quittance_pdf_url = Set(quittance_url);
                am.date_validation_beneficiaire = Set(Some(now.into()));
                am.date_deblocage_escrow = Set(Some(now.into()));
                let updated = am.update(txn).await?;
                // Close the escrow transaction (same atomic unit).
                if let Some(cid) = contrat_id {
                    if let Some(t) = transaction::Entity::find()
                        .filter(transaction::Column::ContratId.eq(cid))
                        .one(txn)
                        .await?
                    {
                        let mut tam: transaction::ActiveModel = t.into();
                        tam.statut = Set(StatutTransaction::Completee);
                        tam.date_completion = Set(Some(now.into()));
                        tam.update(txn).await?;
                    }
                }
                Ok(updated)
            })
        })
        .await
        .map_err(|e| match e {
            sea_orm::TransactionError::Connection(db) => AppError::Database(db),
            sea_orm::TransactionError::Transaction(app) => app,
        })?;

    let contract = match contrat_id {
        Some(cid) => contract::Entity::find_by_id(cid).one(&state.db).await?,
        None => None,
    };
    let listing = match &contract {
        Some(c) => load_listing(&state, c.annonce_id).await?,
        None => None,
    };
    Ok(Json(json!({
        "success": true,
        "data": { "payment": payment_json(&updated, contract.as_ref(), listing.as_ref(), beneficiaire.as_ref()) }
    })))
}

/// `GET /api/payments` — the caller's payments (as payer or beneficiary), newest first.
async fn list(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Query(_params): Query<HashMap<String, String>>,
) -> AppResult<Json<Value>> {
    let rows = payment::Entity::find()
        .filter(
            sea_orm::Condition::any()
                .add(payment::Column::PayeurId.eq(auth.id))
                .add(payment::Column::BeneficiaireId.eq(auth.id)),
        )
        .order_by_desc(payment::Column::DateCreation)
        .all(&state.db)
        .await?;

    let items = hydrate_payments(&state, &rows).await?;
    Ok(Json(json!({ "success": true, "data": items })))
}

/// `GET /api/payments/{id}` — a single payment (payer or beneficiary).
async fn show(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let p = fetch_party_payment(&state, &auth, id).await?;
    let contract = match p.contrat_id {
        Some(cid) => contract::Entity::find_by_id(cid).one(&state.db).await?,
        None => None,
    };
    let listing = match &contract {
        Some(c) => load_listing(&state, c.annonce_id).await?,
        None => None,
    };
    let beneficiaire = user::Entity::find_by_id(p.beneficiaire_id).one(&state.db).await?;
    Ok(Json(json!({
        "success": true,
        "data": { "payment": payment_json(&p, contract.as_ref(), listing.as_ref(), beneficiaire.as_ref()) }
    })))
}

/// `GET /api/payments/{id}/status` — lightweight status poll.
async fn status(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let p = fetch_party_payment(&state, &auth, id).await?;
    Ok(Json(json!({
        "success": true,
        "data": { "id": p.id, "statut_paiement": super::dto::statut_str(&p.statut) }
    })))
}

/// `GET /api/payments/pending-invoices` — signed contracts the caller (tenant)
/// still owes payment on.
async fn pending_invoices(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    let contracts = contract::Entity::find()
        .filter(contract::Column::LocataireAcheteurId.eq(auth.id))
        .filter(contract::Column::Statut.eq(StatutContrat::SigneArchive))
        .all(&state.db)
        .await?;

    // One query for all payments of these contracts (was: one query per contract).
    let contract_ids: Vec<Uuid> = contracts.iter().map(|c| c.id).collect();
    let payments: Vec<payment::Model> = if contract_ids.is_empty() {
        vec![]
    } else {
        payment::Entity::find()
            .filter(payment::Column::ContratId.is_in(contract_ids))
            .all(&state.db)
            .await?
    };
    let paid: HashSet<Uuid> = payments
        .iter()
        .filter(|p| !matches!(p.statut, StatutPaiement::Echoue | StatutPaiement::Rembourse))
        .filter_map(|p| p.contrat_id)
        .collect();

    let mut invoices = Vec::new();
    for c in &contracts {
        if !paid.contains(&c.id) {
            let inv = Invoice::from_contract(c);
            let mut v = invoice_json(c, &inv);
            if let Some(o) = v.as_object_mut() {
                o.insert("contract_id".into(), json!(c.id));
            }
            invoices.push(v);
        }
    }
    Ok(Json(json!({ "success": true, "data": invoices })))
}

/// `POST /api/payments/cash` — record an out-of-band cash payment. Recorded by the
/// **owner** (beneficiary), not the tenant: the tenant must not be able to
/// self-record a payment as confirmed. The contract must be signed and have no
/// prior escrow attempt (transactions.contrat_id is UNIQUE — a fresh cash record is
/// only possible before any mobile-money flow opened a transaction for it).
async fn cash(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<super::dto::ProcessRequest>,
) -> AppResult<Json<Value>> {
    rate_limit::limit_payment(&state.redis, auth.id).await?;

    // Only the owner (beneficiary) records a cash payment.
    let c = contract::Entity::find_by_id(req.contract_id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;
    if c.proprietaire_id != auth.id {
        return Err(AppError::Forbidden("seul le propriétaire peut enregistrer un paiement espèces".into()));
    }
    if !matches!(c.statut, StatutContrat::SigneArchive) {
        return Err(AppError::Conflict("le contrat doit être signé avant paiement".into()));
    }
    assert_no_active_payment(&state, c.id).await?;
    // No prior escrow attempt: a transaction row already exists (even Annulee after a
    // refund) means a mobile-money flow was started — cash is not the recovery path.
    if transaction::Entity::find()
        .filter(transaction::Column::ContratId.eq(c.id))
        .one(&state.db)
        .await?
        .is_some()
    {
        return Err(AppError::Conflict(
            "une transaction existe déjà pour ce contrat (escrow tenté) — cash impossible".into(),
        ));
    }

    let inv = Invoice::from_contract(&c);
    let now = Utc::now();
    let payeur_id = c.locataire_acheteur_id;
    let beneficiaire_id = c.proprietaire_id;
    let contrat_id = c.id;
    let annonce_id = c.annonce_id;
    let caution = inv.caution;
    let commission = inv.commission;
    let total = inv.total;

    let pay = state
        .db
        .transaction::<_, payment::Model, AppError>(|txn| {
            Box::pin(async move {
                let pay = match (payment::ActiveModel {
                    id: Set(Uuid::new_v4()),
                    payeur_id: Set(payeur_id),
                    beneficiaire_id: Set(beneficiaire_id),
                    contrat_id: Set(Some(contrat_id)),
                    type_paiement: Set(TypePaiement::Caution),
                    montant_gnf: Set(caution),
                    commission_plateforme_gnf: Set(commission),
                    montant_total_gnf: Set(total),
                    methode_paiement: Set(MethodePaiement::Especes),
                    // Cash is immediate (no escrow, no quittance): recorded confirmed.
                    statut: Set(StatutPaiement::Confirme),
                    tentatives_paiement: Set(1),
                    date_creation: Set(now.into()),
                    date_confirmation: Set(Some(now.into())),
                    ..Default::default()
                }
                .insert(txn)
                .await)
                {
                    Ok(p) => p,
                    Err(e) if is_unique_violation(&e) => {
                        return Err(AppError::Conflict("un paiement existe déjà pour ce contrat".into()));
                    }
                    Err(e) => return Err(AppError::Database(e)),
                };
                // Cash is settled immediately: the transaction is completed.
                transaction::ActiveModel {
                    id: Set(Uuid::new_v4()),
                    annonce_id: Set(annonce_id),
                    proprietaire_id: Set(beneficiaire_id),
                    locataire_acheteur_id: Set(payeur_id),
                    contrat_id: Set(contrat_id),
                    paiements_ids: Set(json!([pay.id])),
                    type_transaction: Set(TypeOperation::Location),
                    montant_total_gnf: Set(total),
                    commission_plateforme_gnf: Set(commission),
                    statut: Set(StatutTransaction::Completee),
                    date_debut: Set(now.into()),
                    date_completion: Set(Some(now.into())),
                    ..Default::default()
                }
                .insert(txn)
                .await?;
                Ok(pay)
            })
        })
        .await
        .map_err(|e| match e {
            sea_orm::TransactionError::Connection(db) => AppError::Database(db),
            sea_orm::TransactionError::Transaction(app) => app,
        })?;

    Ok(Json(json!({ "success": true, "data": { "payment": payment_json(&pay, Some(&c), None, None) } })))
}

/// `POST /api/payments/{id}/refund` — record an escrow refund. This is a
/// **mediation action**: only a staff member with `ResolveDisputes` may trigger
/// it, because a unilateral refund by either party would let an owner mark a
/// caution as repaid without any money actually moving. The status transition
/// is applied atomically and only from an escrow-held state.
async fn refund(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<RefundRequest>,
) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ResolveDisputes)?;

    let p = payment::Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;
    let previous_statut = super::dto::statut_str(&p.statut);
    let contrat_id = p.contrat_id;

    // Atomic: payment -> Rembourse AND the escrow transaction -> Annulee in ONE tx.
    // The conditional payment UPDATE guards double-refund; closing the transaction
    // prevents the escrow ledger from staying EnCours forever (and the
    // transactions.contrat_id UNIQUE from blocking a later retry via `process`'s
    // upsert, which resets an Annulee row to EnCours).
    let now = Utc::now();
    state
        .db
        .transaction::<_, (), AppError>(|txn| {
            Box::pin(async move {
                let result = payment::Entity::update_many()
                    .col_expr(payment::Column::Statut, statut_expr(StatutPaiement::Rembourse))
                    .filter(payment::Column::Id.eq(id))
                    .filter(
                        payment::Column::Statut
                            .is_in([StatutPaiement::EnEscrow, StatutPaiement::CommissionCollectee]),
                    )
                    .exec(txn)
                    .await?;
                if result.rows_affected == 0 {
                    return Err(AppError::Conflict(
                        "paiement non remboursable (non séquestré ou déjà traité)".into(),
                    ));
                }
                if let Some(cid) = contrat_id {
                    if let Some(t) = transaction::Entity::find()
                        .filter(transaction::Column::ContratId.eq(cid))
                        .one(txn)
                        .await?
                    {
                        let mut tam: transaction::ActiveModel = t.into();
                        tam.statut = Set(StatutTransaction::Annulee);
                        tam.date_completion = Set(Some(now.into()));
                        tam.update(txn).await?;
                    }
                }
                Ok(())
            })
        })
        .await
        .map_err(|e| match e {
            sea_orm::TransactionError::Connection(db) => AppError::Database(db),
            sea_orm::TransactionError::Transaction(app) => app,
        })?;

    let updated = payment::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;

    // Audit the mediation action (best-effort, like admin/audit).
    let _ = admin_audit_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        admin_id: Set(auth.id),
        action: Set("payment.refund".into()),
        target_type: Set(Some("payment".into())),
        target_id: Set(Some(id)),
        details: Set(json!({ "previous_statut": previous_statut, "reason": req.reason })),
        created_at: Set(Utc::now().into()),
    }
    .insert(&state.db)
    .await;

    Ok(Json(json!({ "success": true, "data": { "payment": payment_json(&updated, None, None, None) } })))
}

// --- helpers ---------------------------------------------------------------

/// Sandbox stand-in for an Orange Money / MTN MoMo transaction reference.
fn sandbox_provider_ref(methode: &MethodePaiement) -> String {
    let prefix = match methode {
        MethodePaiement::MtnMomo => "MTN",
        MethodePaiement::OrangeMoney => "OM",
        _ => "SBX",
    };
    format!("{prefix}-SANDBOX-{}", Uuid::new_v4().simple().to_string()[..12].to_uppercase())
}

/// Fetch a contract the caller (tenant) can pay: must be signed and theirs.
async fn fetch_payable_contract(
    state: &AppState,
    auth: &AuthUser,
    contract_id: Uuid,
) -> AppResult<contract::Model> {
    let c = contract::Entity::find_by_id(contract_id).one(&state.db).await?.ok_or(AppError::NotFound)?;
    if c.locataire_acheteur_id != auth.id {
        return Err(AppError::Forbidden("seul le locataire peut payer ce contrat".into()));
    }
    if !matches!(c.statut, StatutContrat::SigneArchive) {
        return Err(AppError::Conflict("le contrat doit être signé avant paiement".into()));
    }
    Ok(c)
}

/// Reject if the contract already has an active (non-failed, non-refunded) payment.
/// Guards both mobile-money (`process`) and cash (`cash`) against double-payment.
async fn assert_no_active_payment(state: &AppState, contract_id: Uuid) -> AppResult<()> {
    if let Some(existing) = payment::Entity::find()
        .filter(payment::Column::ContratId.eq(contract_id))
        .one(&state.db)
        .await?
    {
        if !matches!(existing.statut, StatutPaiement::Echoue | StatutPaiement::Rembourse) {
            return Err(AppError::Conflict("un paiement existe déjà pour ce contrat".into()));
        }
    }
    Ok(())
}

/// A `statut_paiement` value as a typed SQL expression. Postgres rejects a bare
/// text literal for an enum column (`42804: column "statut" is of type
/// statut_paiement but expression is of type text`), so the value is cast to the
/// enum type before being used in a conditional `update_many().col_expr(...)`.
fn statut_expr(v: StatutPaiement) -> sea_orm::sea_query::SimpleExpr {
    use sea_orm::sea_query::{Alias, Expr};
    Expr::value(v).cast_as(Alias::new("statut_paiement"))
}

/// Whether a DB error is a unique-constraint violation (Postgres SQLSTATE 23505).
/// Turns a concurrent-insert race past `assert_no_active_payment` into a friendly
/// 409 instead of a raw 500.
fn is_unique_violation(e: &sea_orm::DbErr) -> bool {
    let s = e.to_string().to_ascii_lowercase();
    s.contains("unique") || s.contains("duplicate") || s.contains("23505")
}

/// Insert the escrow transaction for a contract, or reset the existing row to
/// `EnCours`. `transactions.contrat_id` is UNIQUE, so there is at most one row per
/// contract — a retry (e.g. after a refund cancelled the prior transaction) must
/// UPDATE it, not insert, or it hits a 23505.
async fn upsert_escrow_transaction<C: sea_orm::ConnectionTrait>(
    db: &C,
    annonce_id: Option<Uuid>,
    proprietaire_id: Uuid,
    locataire_acheteur_id: Uuid,
    contrat_id: Uuid,
    payment_id: Uuid,
    total: i64,
    commission: i64,
    now: chrono::DateTime<chrono::Utc>,
) -> AppResult<()> {
    if let Some(t) = transaction::Entity::find()
        .filter(transaction::Column::ContratId.eq(contrat_id))
        .one(db)
        .await?
    {
        let mut tam: transaction::ActiveModel = t.into();
        tam.annonce_id = Set(annonce_id);
        tam.proprietaire_id = Set(proprietaire_id);
        tam.locataire_acheteur_id = Set(locataire_acheteur_id);
        tam.paiements_ids = Set(json!([payment_id]));
        tam.montant_total_gnf = Set(total);
        tam.commission_plateforme_gnf = Set(commission);
        tam.statut = Set(StatutTransaction::EnCours);
        tam.date_debut = Set(now.into());
        tam.date_completion = Set(None);
        tam.update(db).await?;
    } else {
        transaction::ActiveModel {
            id: Set(Uuid::new_v4()),
            annonce_id: Set(annonce_id),
            proprietaire_id: Set(proprietaire_id),
            locataire_acheteur_id: Set(locataire_acheteur_id),
            contrat_id: Set(contrat_id),
            paiements_ids: Set(json!([payment_id])),
            type_transaction: Set(TypeOperation::Location),
            montant_total_gnf: Set(total),
            commission_plateforme_gnf: Set(commission),
            statut: Set(StatutTransaction::EnCours),
            date_debut: Set(now.into()),
            ..Default::default()
        }
        .insert(db)
        .await?;
    }
    Ok(())
}

async fn fetch_party_payment(state: &AppState, auth: &AuthUser, id: Uuid) -> AppResult<payment::Model> {
    let p = payment::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;
    if p.payeur_id != auth.id && p.beneficiaire_id != auth.id {
        return Err(AppError::Forbidden("vous n'êtes pas partie à ce paiement".into()));
    }
    Ok(p)
}

async fn load_listing(state: &AppState, annonce_id: Option<Uuid>) -> AppResult<Option<listing::Model>> {
    match annonce_id {
        Some(a) => Ok(listing::Entity::find_by_id(a).one(&state.db).await?),
        None => Ok(None),
    }
}

/// Embed each payment's contract, listing and beneficiary for a list response.
/// Batched: 3 queries total (contracts, listings, beneficiaries) regardless of
/// the number of rows — was 3 sequential queries per payment (3N total).
async fn hydrate_payments(state: &AppState, rows: &[payment::Model]) -> AppResult<Vec<Value>> {
    if rows.is_empty() {
        return Ok(vec![]);
    }
    let contract_ids: Vec<Uuid> = rows.iter().filter_map(|p| p.contrat_id).collect();
    let contracts: HashMap<Uuid, contract::Model> = if contract_ids.is_empty() {
        HashMap::new()
    } else {
        contract::Entity::find()
            .filter(contract::Column::Id.is_in(contract_ids))
            .all(&state.db)
            .await?
            .into_iter()
            .map(|c| (c.id, c))
            .collect()
    };
    let listing_ids: Vec<Uuid> = contracts.values().filter_map(|c| c.annonce_id).collect();
    let listings: HashMap<Uuid, listing::Model> = if listing_ids.is_empty() {
        HashMap::new()
    } else {
        listing::Entity::find()
            .filter(listing::Column::Id.is_in(listing_ids))
            .all(&state.db)
            .await?
            .into_iter()
            .map(|l| (l.id, l))
            .collect()
    };
    let beneficiaire_ids: Vec<Uuid> = rows.iter().map(|p| p.beneficiaire_id).collect();
    let beneficiaries: HashMap<Uuid, user::Model> = if beneficiaire_ids.is_empty() {
        HashMap::new()
    } else {
        user::Entity::find()
            .filter(user::Column::Id.is_in(beneficiaire_ids))
            .all(&state.db)
            .await?
            .into_iter()
            .map(|u| (u.id, u))
            .collect()
    };

    let mut out = Vec::with_capacity(rows.len());
    for p in rows {
        let contract = p.contrat_id.and_then(|cid| contracts.get(&cid));
        let listing = contract.and_then(|c| c.annonce_id).and_then(|a| listings.get(&a));
        let beneficiaire = beneficiaries.get(&p.beneficiaire_id);
        out.push(payment_json(p, contract, listing, beneficiaire));
    }
    Ok(out)
}

/// Typst source for the deposit receipt (quittance).
fn quittance_source(p: &payment::Model, payeur: &user::Model, beneficiaire: &user::Model) -> String {
    let esc = pdf::escape;
    let ext = p.numero_transaction_externe.clone().unwrap_or_default();
    let date = p.date_confirmation.unwrap_or(p.date_creation).format("%d/%m/%Y").to_string();
    format!(
        r##"#set page(paper: "a4", margin: 2.5cm)
#set text(font: ("DejaVu Sans", "Arial"), size: 11pt, lang: "fr")
#align(center)[#text(size: 16pt, weight: "bold")[QUITTANCE DE CAUTION]]
#align(center)[#text(size: 9pt, fill: rgb("#666"))[ImmoGuinée — Référence {reference}]]
#v(1em)
#line(length: 100%, stroke: 0.5pt + rgb("#ccc"))
#v(1em)
Reçu de *{payeur}* la somme de :
#v(0.4em)
#align(center)[#text(size: 14pt, weight: "bold")[{total}]]
#v(0.6em)
au titre de :
#list(
  [Caution : {caution}],
  [Commission plateforme : {commission}],
)
#v(0.6em)
Bénéficiaire (dépôt de garantie) : *{beneficiaire}*.
#v(0.4em)
Mode de paiement : {methode} — Transaction : {ext}
#v(0.4em)
Date : {date}
#v(2em)
#align(center)[#text(size: 8pt, fill: rgb("#999"))[Quittance générée automatiquement par ImmoGuinée — valeur probante.]]
"##,
        reference = esc(&reference_paiement_for(p.id)),
        payeur = esc(&payeur.nom_complet),
        beneficiaire = esc(&beneficiaire.nom_complet),
        total = esc(&fmt_gnf(p.montant_total_gnf)),
        caution = esc(&fmt_gnf(p.montant_gnf)),
        commission = esc(&fmt_gnf(p.commission_plateforme_gnf)),
        methode = esc(super::dto::methode_str(&p.methode_paiement)),
        ext = esc(&ext),
        date = esc(&date),
    )
}
