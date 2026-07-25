//! Payments (US4 — commission + escrow). **Sandbox provider**: the Orange Money /
//! MTN MoMo call is simulated (instant confirmation + external ref) until real
//! merchant credentials are wired. The escrow/commission state machine is real:
//! the tenant pays deposit + platform commission; the deposit is held in escrow
//! and released to the owner on their confirmation, when a quittance PDF is issued.

use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter, QueryOrder,
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
    if let Some(existing) = payment::Entity::find()
        .filter(payment::Column::ContratId.eq(c.id))
        .one(&state.db)
        .await?
    {
        if !matches!(existing.statut, StatutPaiement::Echoue | StatutPaiement::Rembourse) {
            return Err(AppError::Conflict("un paiement existe déjà pour ce contrat".into()));
        }
    }

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
    let pay = payment::ActiveModel {
        id: Set(id),
        payeur_id: Set(auth.id),
        beneficiaire_id: Set(c.proprietaire_id),
        contrat_id: Set(Some(c.id)),
        type_paiement: Set(TypePaiement::Caution),
        montant_gnf: Set(inv.caution),
        commission_plateforme_gnf: Set(inv.commission),
        montant_total_gnf: Set(inv.total),
        methode_paiement: Set(methode),
        // Deposit escrowed, commission collected — both happen at confirmation.
        statut: Set(StatutPaiement::EnEscrow),
        numero_transaction_externe: Set(Some(external_ref)),
        tentatives_paiement: Set(1),
        date_creation: Set(now.into()),
        date_confirmation: Set(Some(now.into())),
        ..Default::default()
    }
    .insert(&state.db)
    .await?;

    // Open the escrow transaction.
    transaction::ActiveModel {
        id: Set(Uuid::new_v4()),
        annonce_id: Set(c.annonce_id),
        proprietaire_id: Set(c.proprietaire_id),
        locataire_acheteur_id: Set(auth.id),
        contrat_id: Set(c.id),
        paiements_ids: Set(json!([id])),
        type_transaction: Set(TypeOperation::Location),
        montant_total_gnf: Set(inv.total),
        commission_plateforme_gnf: Set(inv.commission),
        statut: Set(StatutTransaction::EnCours),
        date_debut: Set(now.into()),
        ..Default::default()
    }
    .insert(&state.db)
    .await?;

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

    // Atomic conditional update: only one concurrent validate can win (anti double-release).
    // UPDATE payments SET statut = CONFIRME WHERE id = ? AND statut IN (EN_ESCROW, COMMISSION_COLLECTEE)
    let result = payment::Entity::update_many()
        .col_expr(
            payment::Column::Statut,
            sea_orm::sea_query::Expr::value(StatutPaiement::Confirme),
        )
        .filter(payment::Column::Id.eq(id))
        .filter(payment::Column::Statut.is_in([
            StatutPaiement::EnEscrow,
            StatutPaiement::CommissionCollectee,
        ]))
        .exec(&state.db)
        .await?;
    if result.rows_affected == 0 {
        return Err(AppError::Conflict("paiement déjà validé ou non en séquestre".into()));
    }

    // Re-fetch the now-Confirme payment (only the winner reaches here).
    let p = payment::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;
    let contract = match p.contrat_id {
        Some(cid) => contract::Entity::find_by_id(cid).one(&state.db).await?,
        None => None,
    };
    let payeur = user::Entity::find_by_id(p.payeur_id).one(&state.db).await?;
    let beneficiaire = user::Entity::find_by_id(p.beneficiaire_id).one(&state.db).await?;

    // Issue the deposit receipt (quittance) PDF. Typst compilation is CPU-bound
    // → run on a blocking thread so it cannot stall the async reactor.
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

    let now = Utc::now();
    let contrat_id = p.contrat_id;
    let mut am: payment::ActiveModel = p.into();
    am.quittance_pdf_url = Set(quittance_url);
    am.date_validation_beneficiaire = Set(Some(now.into()));
    am.date_deblocage_escrow = Set(Some(now.into()));
    let updated = am.update(&state.db).await?;

    // Close the escrow transaction.
    if let Some(cid) = contrat_id {
        if let Some(t) = transaction::Entity::find()
            .filter(transaction::Column::ContratId.eq(cid))
            .one(&state.db)
            .await?
        {
            let mut tam: transaction::ActiveModel = t.into();
            tam.statut = Set(StatutTransaction::Completee);
            tam.date_completion = Set(Some(now.into()));
            tam.update(&state.db).await?;
        }
    }

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

    let mut invoices = Vec::new();
    for c in &contracts {
        let paid = payment::Entity::find()
            .filter(payment::Column::ContratId.eq(c.id))
            .one(&state.db)
            .await?
            .map(|p| !matches!(p.statut, StatutPaiement::Echoue | StatutPaiement::Rembourse))
            .unwrap_or(false);
        if !paid {
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

/// `POST /api/payments/cash` — record an out-of-band cash payment.
async fn cash(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<super::dto::ProcessRequest>,
) -> AppResult<Json<Value>> {
    rate_limit::limit_payment(&state.redis, auth.id).await?;
    let c = fetch_payable_contract(&state, &auth, req.contract_id).await?;
    let inv = Invoice::from_contract(&c);
    let now = Utc::now();
    let pay = payment::ActiveModel {
        id: Set(Uuid::new_v4()),
        payeur_id: Set(auth.id),
        beneficiaire_id: Set(c.proprietaire_id),
        contrat_id: Set(Some(c.id)),
        type_paiement: Set(TypePaiement::Caution),
        montant_gnf: Set(inv.caution),
        commission_plateforme_gnf: Set(inv.commission),
        montant_total_gnf: Set(inv.total),
        methode_paiement: Set(MethodePaiement::Especes),
        statut: Set(StatutPaiement::Confirme),
        tentatives_paiement: Set(1),
        date_creation: Set(now.into()),
        date_confirmation: Set(Some(now.into())),
        ..Default::default()
    }
    .insert(&state.db)
    .await?;
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
    rate_limit::limit_payment(&state.redis, auth.id).await?;

    let p = payment::Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;
    let previous_statut = super::dto::statut_str(&p.statut);

    // Atomic conditional update: only an escrow-held payment can be refunded,
    // and only one concurrent refund can win (anti double-refund).
    let result = payment::Entity::update_many()
        .col_expr(
            payment::Column::Statut,
            sea_orm::sea_query::Expr::value(StatutPaiement::Rembourse),
        )
        .filter(payment::Column::Id.eq(id))
        .filter(payment::Column::Statut.is_in([StatutPaiement::EnEscrow, StatutPaiement::CommissionCollectee]))
        .exec(&state.db)
        .await?;
    if result.rows_affected == 0 {
        return Err(AppError::Conflict("paiement non remboursable (non séquestré ou déjà traité)".into()));
    }

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
async fn hydrate_payments(state: &AppState, rows: &[payment::Model]) -> AppResult<Vec<Value>> {
    let mut out = Vec::with_capacity(rows.len());
    for p in rows {
        let contract = match p.contrat_id {
            Some(cid) => contract::Entity::find_by_id(cid).one(&state.db).await?,
            None => None,
        };
        let listing = match &contract {
            Some(c) => load_listing(state, c.annonce_id).await?,
            None => None,
        };
        let beneficiaire = user::Entity::find_by_id(p.beneficiaire_id).one(&state.db).await?;
        out.push(payment_json(p, contract.as_ref(), listing.as_ref(), beneficiaire.as_ref()));
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
#set text(font: "DejaVu Sans", size: 11pt, lang: "fr")
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
