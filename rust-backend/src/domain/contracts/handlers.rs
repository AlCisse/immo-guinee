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
    let duree = if req.duree_indeterminee.unwrap_or(false) {
        "durée indéterminée".to_string()
    } else if let Some(m) = req.duree_mois {
        format!("{m} mois")
    } else {
        "—".to_string()
    };

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
    let adresse = listing
        .adresse_complete
        .clone()
        .unwrap_or_else(|| enum_str(&listing.quartier));
    let ctx = ContractContext {
        reference: reference_for(id),
        titre: "CONTRAT DE LOCATION RÉSIDENTIEL".into(),
        date_generation: Utc::now().format("%d/%m/%Y").to_string(),
        proprietaire_nom: proprietaire.nom_complet.clone(),
        proprietaire_tel: proprietaire.telephone.clone(),
        locataire_nom: locataire.nom_complet.clone(),
        locataire_tel: locataire.telephone.clone(),
        bien_designation: listing.titre.clone(),
        bien_adresse: adresse,
        loyer: fmt_gnf(loyer),
        caution: fmt_gnf(caution),
        date_debut: req.date_debut.clone(),
        duree,
        clauses: req.clauses_speciales.unwrap_or_default(),
    };

    // Render + hash + store.
    let pdf_bytes = pdf::render(build_source(&ctx))?;
    let hash = format!("{:x}", Sha256::digest(&pdf_bytes));
    let key = format!("contracts/{id}.pdf");
    let url = state.storage.put(&key, &pdf_bytes, "application/pdf").await?;

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
async fn download(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Response> {
    let _ = fetch_party_contract(&state, &auth, id).await?;
    let bytes = state.storage.get(&format!("contracts/{id}.pdf")).await?;
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
