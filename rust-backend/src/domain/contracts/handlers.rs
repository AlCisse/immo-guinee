//! Contracts (US2 — generation of Loi 2016/037 leases as PDF).
//!
//! Flow: `POST /contracts` renders a Typst lease to PDF, stores it in S3, records
//! its SHA-256, and creates the contract in `BROUILLON`. It can then be previewed /
//! downloaded and sent for signature (`EN_ATTENTE_SIGNATURE`, 48h retraction).
//! Electronic signing (OTP) is US3.

use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::http::header;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::{Duration, Utc};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, Condition, EntityTrait, QueryFilter,
    QueryOrder,
};
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::db::entities::sea_orm_active_enums::{StatutContrat, TypeContrat};
use crate::db::entities::{contract, listing, user};
use crate::error::{AppError, AppResult};
use crate::extractors::{AuthUser, ValidatedJson};
use crate::services::pdf;
use crate::state::AppState;

use super::dto::{GenerateContractRequest, contract_json, reference_for};
use super::template::{ContractContext, build_source, fmt_gnf};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/contracts", get(list).post(create))
        .route("/contracts/me", get(list))
        .route("/contracts/{id}", get(show))
        .route("/contracts/{id}/preview", get(preview))
        .route("/contracts/{id}/download", get(download))
        .route("/contracts/{id}/send", post(send))
        .route("/contracts/{id}/cancel", post(cancel))
        .route("/contracts/{id}/sign/request-otp", post(request_sign_otp))
        .route("/contracts/{id}/sign", post(sign))
}

/// `POST /api/contracts` — generate a lease PDF and create the contract (BROUILLON).
async fn create(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<GenerateContractRequest>,
) -> AppResult<Json<Value>> {
    let listing = listing::Entity::find_by_id(req.listing_id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;

    // Only the listing's owner can create a contract on it (anti-fraud).
    if listing.createur_id != auth.id {
        return Err(AppError::Forbidden("Vous n'êtes pas le propriétaire de cette annonce".into()));
    }

    // The creator is the owner; the tenant/buyer must be an existing user.
    let locataire_id = req
        .locataire_id
        .ok_or_else(|| AppError::Validation("locataire_id requis pour générer le contrat".into()))?;
    if locataire_id == auth.id {
        return Err(AppError::Validation("le locataire doit être différent du propriétaire".into()));
    }
    let proprietaire = user::Entity::find_by_id(auth.id).one(&state.db).await?.ok_or(AppError::Unauthorized)?;
    let locataire = user::Entity::find_by_id(locataire_id).one(&state.db).await?.ok_or(AppError::NotFound)?;

    let type_contrat = match req.type_contrat.as_str() {
        "vente" | "VENTE" => TypeContrat::PromesseVenteTerrain,
        _ => TypeContrat::BailLocationResidentiel,
    };

    let loyer = req.montant_loyer.unwrap_or(listing.prix_gnf);
    let caution = req.montant_caution.unwrap_or(0);

    let donnees = json!({
        "date_debut": req.date_debut,
        "date_fin": req.date_fin,
        "duree_mois": req.duree_mois,
        "duree_indeterminee": req.duree_indeterminee,
        "montant_loyer": loyer,
        "montant_caution": caution,
        "prix_vente": req.prix_vente,
        "clauses_speciales": req.clauses_speciales.clone().unwrap_or_default(),
    });

    let id = Uuid::new_v4();
    let ctx = build_ctx(id, &donnees, &json!([]), Some(&listing), &proprietaire, &locataire);
    let (url, hash) = render_and_store(&state, id, &ctx).await?;

    let model = contract::ActiveModel {
        id: Set(id),
        type_contrat: Set(type_contrat),
        annonce_id: Set(Some(req.listing_id)),
        proprietaire_id: Set(auth.id),
        locataire_acheteur_id: Set(locataire_id),
        donnees_personnalisees: Set(donnees),
        statut: Set(StatutContrat::Brouillon),
        fichier_pdf_url: Set(Some(url)),
        hash_sha256: Set(Some(hash)),
        signatures: Set(json!([])),
        date_creation: Set(Utc::now().into()),
        ..Default::default()
    }
    .insert(&state.db)
    .await?;

    Ok(Json(json!({
        "success": true,
        "data": { "contract": contract_json(&model, Some(&listing), Some(&proprietaire), Some(&locataire)) }
    })))
}

/// `GET /api/contracts` (and `/contracts/me`) — the caller's contracts (as either
/// party), newest first. `?role=proprietaire|locataire` narrows the side.
async fn list(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
) -> AppResult<Json<Value>> {
    let cond = match params.get("role").map(String::as_str) {
        Some("proprietaire") => Condition::all().add(contract::Column::ProprietaireId.eq(auth.id)),
        Some("locataire") => Condition::all().add(contract::Column::LocataireAcheteurId.eq(auth.id)),
        _ => Condition::any()
            .add(contract::Column::ProprietaireId.eq(auth.id))
            .add(contract::Column::LocataireAcheteurId.eq(auth.id)),
    };
    let rows = contract::Entity::find()
        .filter(cond)
        .order_by_desc(contract::Column::DateCreation)
        .all(&state.db)
        .await?;

    let (listings, users) = load_refs(&state.db, &rows).await?;
    let contracts: Vec<Value> = rows
        .iter()
        .map(|c| {
            contract_json(
                c,
                c.annonce_id.and_then(|a| listings.get(&a)),
                users.get(&c.proprietaire_id),
                users.get(&c.locataire_acheteur_id),
            )
        })
        .collect();

    Ok(Json(json!({ "success": true, "data": { "contracts": contracts } })))
}

/// `GET /api/contracts/{id}` — a single contract (must be a party).
async fn show(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let c = fetch_party_contract(&state, &auth, id).await?;
    let listing = match c.annonce_id {
        Some(a) => listing::Entity::find_by_id(a).one(&state.db).await?,
        None => None,
    };
    let proprietaire = user::Entity::find_by_id(c.proprietaire_id).one(&state.db).await?;
    let locataire = user::Entity::find_by_id(c.locataire_acheteur_id).one(&state.db).await?;
    Ok(Json(json!({
        "success": true,
        "data": { "contract": contract_json(&c, listing.as_ref(), proprietaire.as_ref(), locataire.as_ref()) }
    })))
}

/// `GET /api/contracts/{id}/preview` — the stored PDF URL for inline display.
async fn preview(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let c = fetch_party_contract(&state, &auth, id).await?;
    Ok(Json(json!({ "success": true, "data": { "preview_url": c.fichier_pdf_url } })))
}

/// `GET /api/contracts/{id}/download` — stream the PDF bytes (authenticated).
/// The stored SHA-256 is recomputed and compared so a substituted/tampered
/// object in S3 is detected rather than silently served as an authentic lease.
async fn download(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Response> {
    let c = fetch_party_contract(&state, &auth, id).await?;
    let bytes = state.storage.get(&format!("contracts/{id}.pdf")).await?;
    if let Some(stored) = &c.hash_sha256 {
        let actual = format!("{:x}", Sha256::digest(&bytes));
        if &actual != stored {
            tracing::error!(
                contract_id = %id,
                expected = %stored,
                actual = %actual,
                "hash PDF mismatch — refus de servir un bail potentiellement falsifié"
            );
            return Err(AppError::Internal(anyhow::anyhow!("intégrité du PDF compromise")));
        }
    }
    Ok((
        [
            (header::CONTENT_TYPE, "application/pdf".to_string()),
            (
                header::CONTENT_DISPOSITION,
                format!("inline; filename=\"contrat-{}.pdf\"", reference_for(id)),
            ),
        ],
        bytes,
    )
        .into_response())
}

/// `POST /api/contracts/{id}/send` — send for signature (48h retraction window).
async fn send(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let c = fetch_party_contract(&state, &auth, id).await?;
    if c.proprietaire_id != auth.id {
        return Err(AppError::Forbidden("seul le propriétaire peut envoyer le contrat".into()));
    }
    let locataire_id = c.locataire_acheteur_id;
    let mut am: contract::ActiveModel = c.into();
    am.statut = Set(StatutContrat::EnAttenteSignature);
    am.delai_retractation_expire = Set(Some((Utc::now() + Duration::hours(48)).into()));
    am.update(&state.db).await?;

    // Notify the tenant (best-effort — delivery failure must not fail the send).
    if let Some(loc) = user::Entity::find_by_id(locataire_id).one(&state.db).await? {
        let msg = format!(
            "ImmoGuinée : un contrat ({}) vous a été envoyé pour signature électronique. \
             Vous disposez de 48h de rétractation.",
            reference_for(id)
        );
        if let Err(e) = crate::services::notify::send_direct(&state, &loc.telephone, &msg).await {
            tracing::warn!(error = %e, "notification d'envoi de contrat échouée");
        }
    }
    Ok(Json(json!({ "success": true, "data": { "id": id, "statut": "EN_ATTENTE_SIGNATURE" } })))
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct CancelRequest {
    pub motif: Option<String>,
}

/// `POST /api/contracts/{id}/cancel` — cancel a draft / not-yet-signed contract.
async fn cancel(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(_req): ValidatedJson<CancelRequest>,
) -> AppResult<Json<Value>> {
    let c = fetch_party_contract(&state, &auth, id).await?;
    if matches!(c.statut, StatutContrat::SigneArchive) {
        return Err(AppError::Conflict("un contrat signé et archivé ne peut être annulé".into()));
    }
    let mut am: contract::ActiveModel = c.into();
    am.statut = Set(StatutContrat::Annule);
    am.update(&state.db).await?;
    Ok(Json(json!({ "success": true, "data": { "id": id, "statut": "ANNULE" } })))
}

/// `POST /api/contracts/{id}/sign/request-otp` — send the caller a signing OTP.
async fn request_sign_otp(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let c = fetch_party_contract(&state, &auth, id).await?;
    ensure_signable(&c, auth.id)?;
    let phone = signer_phone(&state, auth.id).await?;
    // Scope the OTP by contract_id so a code issued for contract A cannot be
    // replayed to sign contract B (the Redis key is otp:code:contract:{id}:{phone}).
    let scoped = format!("contract:{}:{}", id, phone);
    let code = crate::services::otp::request(&state.redis, &scoped).await?;
    crate::services::notify::send_otp_code(&state, &phone, &code).await?;
    Ok(Json(json!({ "success": true, "data": { "expires_in": 300 } })))
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct SignRequest {
    // The two contract pages post either `otp` or `otp_code`; accept both.
    pub otp: Option<String>,
    pub otp_code: Option<String>,
}

/// `POST /api/contracts/{id}/sign` — verify the OTP and record the caller's
/// electronic signature. When both parties have signed, the contract is sealed
/// (SIGNE_ARCHIVE) and becomes immutable.
async fn sign(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<SignRequest>,
) -> AppResult<Json<Value>> {
    let c = fetch_party_contract(&state, &auth, id).await?;
    ensure_signable(&c, auth.id)?;

    let code = req
        .otp
        .or(req.otp_code)
        .ok_or_else(|| AppError::Validation("code OTP requis".into()))?;
    let phone = signer_phone(&state, auth.id).await?;
    // Verify against the contract-scoped key (must match request_sign_otp).
    let scoped = format!("contract:{}:{}", id, phone);
    crate::services::otp::verify(&state.redis, &scoped, &code).await?;

    // Record the signature (role + timestamp + seal).
    let role = if c.proprietaire_id == auth.id { "proprietaire" } else { "locataire" };
    let now = Utc::now();
    let mut signatures = c.signatures.as_array().cloned().unwrap_or_default();
    signatures.push(json!({
        "role": role,
        "user_id": auth.id,
        "telephone": phone,
        "signed_at": now.to_rfc3339(),
        "cachet": "Signé électroniquement via ImmoGuinée",
    }));
    let signatures = json!(signatures);

    let both_signed = has_role(&signatures, "proprietaire") && has_role(&signatures, "locataire");
    let statut = if both_signed { StatutContrat::SigneArchive } else { StatutContrat::PartiellementSigne };

    // Re-render the PDF with the updated signature block(s) and re-store it.
    let listing = match c.annonce_id {
        Some(a) => listing::Entity::find_by_id(a).one(&state.db).await?,
        None => None,
    };
    let proprietaire = user::Entity::find_by_id(c.proprietaire_id).one(&state.db).await?;
    let locataire = user::Entity::find_by_id(c.locataire_acheteur_id).one(&state.db).await?;
    let (url, hash) = match (&proprietaire, &locataire) {
        (Some(p), Some(l)) => {
            let ctx = build_ctx(id, &c.donnees_personnalisees, &signatures, listing.as_ref(), p, l);
            render_and_store(&state, id, &ctx).await?
        }
        _ => (c.fichier_pdf_url.clone().unwrap_or_default(), c.hash_sha256.clone().unwrap_or_default()),
    };

    let mut am: contract::ActiveModel = c.into();
    am.signatures = Set(signatures);
    am.statut = Set(statut.clone());
    am.fichier_pdf_url = Set(Some(url));
    am.hash_sha256 = Set(Some(hash));
    if both_signed {
        am.date_signature_complete = Set(Some(now.into()));
    }
    let updated = am.update(&state.db).await?;

    Ok(Json(json!({
        "success": true,
        "data": { "contract": contract_json(&updated, listing.as_ref(), proprietaire.as_ref(), locataire.as_ref()) }
    })))
}

// --- helpers ---------------------------------------------------------------

/// Fetch a contract and ensure the caller is one of its parties.
async fn fetch_party_contract(
    state: &AppState,
    auth: &AuthUser,
    id: Uuid,
) -> AppResult<contract::Model> {
    let c = contract::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;
    if c.proprietaire_id != auth.id && c.locataire_acheteur_id != auth.id {
        return Err(AppError::Forbidden("vous n'êtes pas partie à ce contrat".into()));
    }
    Ok(c)
}

/// Batch-load the listings and users referenced by a set of contracts.
async fn load_refs(
    db: &sea_orm::DatabaseConnection,
    rows: &[contract::Model],
) -> AppResult<(HashMap<Uuid, listing::Model>, HashMap<Uuid, user::Model>)> {
    let listing_ids: Vec<Uuid> = rows.iter().filter_map(|c| c.annonce_id).collect();
    let listings: HashMap<Uuid, listing::Model> = if listing_ids.is_empty() {
        HashMap::new()
    } else {
        listing::Entity::find()
            .filter(listing::Column::Id.is_in(listing_ids))
            .all(db)
            .await?
            .into_iter()
            .map(|l| (l.id, l))
            .collect()
    };
    let mut uids: Vec<Uuid> = Vec::new();
    for c in rows {
        uids.push(c.proprietaire_id);
        uids.push(c.locataire_acheteur_id);
    }
    let users: HashMap<Uuid, user::Model> = if uids.is_empty() {
        HashMap::new()
    } else {
        user::Entity::find()
            .filter(user::Column::Id.is_in(uids))
            .all(db)
            .await?
            .into_iter()
            .map(|u| (u.id, u))
            .collect()
    };
    Ok((listings, users))
}

/// Serialize an enum value to its SCREAMING_SNAKE string (e.g. quartier → "RATOMA").
fn enum_str<T: serde::Serialize>(v: &T) -> String {
    serde_json::to_value(v).ok().and_then(|x| x.as_str().map(str::to_owned)).unwrap_or_default()
}

/// A contract may only be signed while awaiting signatures, and each party signs
/// at most once.
fn ensure_signable(c: &contract::Model, user_id: Uuid) -> AppResult<()> {
    if !matches!(c.statut, StatutContrat::EnAttenteSignature | StatutContrat::PartiellementSigne) {
        return Err(AppError::Conflict("le contrat n'est pas en attente de signature".into()));
    }
    let role = if c.proprietaire_id == user_id { "proprietaire" } else { "locataire" };
    if has_role(&c.signatures, role) {
        return Err(AppError::Conflict("vous avez déjà signé ce contrat".into()));
    }
    Ok(())
}

/// Whether the signatures array already contains a signature for `role`.
fn has_role(signatures: &Value, role: &str) -> bool {
    signatures
        .as_array()
        .map(|a| a.iter().any(|s| s.get("role").and_then(Value::as_str) == Some(role)))
        .unwrap_or(false)
}

/// The phone of the signer (OTP is issued/verified against it).
async fn signer_phone(state: &AppState, user_id: Uuid) -> AppResult<String> {
    let u = user::Entity::find_by_id(user_id).one(&state.db).await?.ok_or(AppError::Unauthorized)?;
    Ok(u.telephone)
}

/// The signature status line for a party, for the PDF signature block.
fn sig_line(signatures: &Value, role: &str) -> String {
    signatures
        .as_array()
        .and_then(|a| a.iter().find(|s| s.get("role").and_then(Value::as_str) == Some(role)))
        .and_then(|s| s.get("signed_at").and_then(Value::as_str))
        .map(|ts| {
            let date = chrono::DateTime::parse_from_rfc3339(ts)
                .map(|d| d.format("%d/%m/%Y à %H:%M").to_string())
                .unwrap_or_else(|_| ts.to_owned());
            format!("Signé électroniquement le {date} — cachet ImmoGuinée")
        })
        .unwrap_or_else(|| "Signature électronique — en attente".to_owned())
}

/// Build the lease template context from stored contract data + signatures.
fn build_ctx(
    id: Uuid,
    donnees: &Value,
    signatures: &Value,
    listing: Option<&listing::Model>,
    proprietaire: &user::Model,
    locataire: &user::Model,
) -> ContractContext {
    let gi = |k: &str| donnees.get(k).and_then(Value::as_i64);
    let indet = donnees.get("duree_indeterminee").and_then(Value::as_bool).unwrap_or(false);
    let duree = if indet {
        "durée indéterminée".to_owned()
    } else if let Some(m) = gi("duree_mois") {
        format!("{m} mois")
    } else {
        "—".to_owned()
    };
    let clauses: Vec<String> = donnees
        .get("clauses_speciales")
        .and_then(Value::as_array)
        .map(|a| a.iter().filter_map(|v| v.as_str().map(str::to_owned)).collect())
        .unwrap_or_default();
    let (designation, adresse) = match listing {
        Some(l) => (
            l.titre.clone(),
            l.adresse_complete.clone().unwrap_or_else(|| enum_str(&l.quartier)),
        ),
        None => ("Bien immobilier".to_owned(), "—".to_owned()),
    };

    ContractContext {
        reference: reference_for(id),
        titre: "CONTRAT DE LOCATION RÉSIDENTIEL".to_owned(),
        date_generation: Utc::now().format("%d/%m/%Y").to_string(),
        proprietaire_nom: proprietaire.nom_complet.clone(),
        proprietaire_tel: proprietaire.telephone.clone(),
        locataire_nom: locataire.nom_complet.clone(),
        locataire_tel: locataire.telephone.clone(),
        bien_designation: designation,
        bien_adresse: adresse,
        loyer: fmt_gnf(gi("montant_loyer").unwrap_or(0)),
        caution: fmt_gnf(gi("montant_caution").unwrap_or(0)),
        date_debut: donnees.get("date_debut").and_then(Value::as_str).unwrap_or("").to_owned(),
        duree,
        clauses,
        proprietaire_signature: sig_line(signatures, "proprietaire"),
        locataire_signature: sig_line(signatures, "locataire"),
    }
}

/// Render the lease to PDF and store it in S3; returns `(public_url, sha256)`.
/// The Typst compilation (`pdf::render`) is CPU-bound and can take hundreds of
/// ms to seconds — it runs on a blocking thread so it cannot stall the async
/// reactor (the 60s `TimeoutLayer` cannot cancel work done on the async thread).
async fn render_and_store(
    state: &AppState,
    id: Uuid,
    ctx: &ContractContext,
) -> AppResult<(String, String)> {
    let source = build_source(ctx); // cheap string assembly, fine on the async thread
    let pdf_bytes = spawn_blocking_render(source).await?;
    let hash = format!("{:x}", Sha256::digest(&pdf_bytes));
    let key = format!("contracts/{id}.pdf");
    let url = state.storage.put(&key, &pdf_bytes, "application/pdf").await?;
    Ok((url, hash))
}

/// Run the CPU-bound Typst render on a blocking thread, flattening the nested
/// `Result<Result<_, JoinError>, _>` into a single `AppResult`.
async fn spawn_blocking_render(source: String) -> AppResult<Vec<u8>> {
    match tokio::task::spawn_blocking(move || pdf::render(source)).await {
        Ok(Ok(bytes)) => Ok(bytes),
        Ok(Err(e)) => Err(e),
        Err(e) => Err(AppError::Internal(anyhow::anyhow!("pdf render task: {e}"))),
    }
}
