//! Visit scheduling endpoints (US10). A visit links a requester (demandeur) and the
//! listing owner (proprietaire); both can see and act on it.

use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::{Path, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::{NaiveDate, NaiveTime};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, Condition, EntityTrait, QueryFilter,
    QueryOrder,
};
use uuid::Uuid;

use crate::db::entities::sea_orm_active_enums::StatutVisite;
use crate::db::entities::{listing, user, visit};
use crate::error::{AppError, AppResult};
use crate::extractors::{AuthUser, ValidatedJson};
use crate::state::AppState;

use super::dto::{
    CancelRequest, CreateVisitRequest, Envelope, VisitResponse, VisitStats,
};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/visits", get(list).post(create))
        .route("/visits/upcoming", get(upcoming))
        .route("/visits/stats", get(stats))
        .route("/visits/{id}", get(get_one).delete(destroy))
        .route("/visits/{id}/confirm", post(confirm))
        .route("/visits/{id}/complete", post(complete))
        .route("/visits/{id}/cancel", post(cancel))
}

/// Visits where the caller is either the requester or the owner.
fn mine(user_id: Uuid) -> Condition {
    Condition::any()
        .add(visit::Column::DemandeurId.eq(user_id))
        .add(visit::Column::ProprietaireId.eq(user_id))
}

/// Resolve the listings + requester users referenced by a set of visits (batched).
async fn hydrate(
    db: &sea_orm::DatabaseConnection,
    visits: &[visit::Model],
) -> AppResult<(HashMap<Uuid, listing::Model>, HashMap<Uuid, user::Model>)> {
    let listing_ids: Vec<Uuid> = visits.iter().map(|v| v.annonce_id).collect();
    let user_ids: Vec<Uuid> = visits.iter().map(|v| v.demandeur_id).collect();

    let listings = if listing_ids.is_empty() {
        vec![]
    } else {
        listing::Entity::find().filter(listing::Column::Id.is_in(listing_ids)).all(db).await?
    };
    let users = if user_ids.is_empty() {
        vec![]
    } else {
        user::Entity::find().filter(user::Column::Id.is_in(user_ids)).all(db).await?
    };

    Ok((
        listings.into_iter().map(|l| (l.id, l)).collect(),
        users.into_iter().map(|u| (u.id, u)).collect(),
    ))
}

fn to_responses(
    visits: Vec<visit::Model>,
    listings: &HashMap<Uuid, listing::Model>,
    users: &HashMap<Uuid, user::Model>,
) -> Vec<VisitResponse> {
    visits
        .into_iter()
        .map(|v| {
            let l = listings.get(&v.annonce_id);
            let u = users.get(&v.demandeur_id);
            VisitResponse::build(v, l, u)
        })
        .collect()
}

/// `POST /api/visits` — request a visit for a listing (caller = demandeur).
async fn create(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<CreateVisitRequest>,
) -> AppResult<Json<Envelope<VisitResponse>>> {
    let listing = listing::Entity::find_by_id(req.listing_id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;

    let date = NaiveDate::parse_from_str(req.date_visite.trim(), "%Y-%m-%d")
        .map_err(|_| AppError::Validation("Date invalide (YYYY-MM-DD)".into()))?;
    let time = NaiveTime::parse_from_str(req.heure_visite.trim(), "%H:%M")
        .map_err(|_| AppError::Validation("Heure invalide (HH:MM)".into()))?;
    // Guinea is GMT (UTC+0); store the combined instant.
    let date_visite = date.and_time(time).and_utc().fixed_offset();

    let now = chrono::Utc::now().fixed_offset();
    let model = visit::ActiveModel {
        id: Set(Uuid::new_v4()),
        annonce_id: Set(listing.id),
        demandeur_id: Set(auth.id),
        proprietaire_id: Set(listing.createur_id),
        date_visite: Set(date_visite),
        statut: Set(StatutVisite::EnAttente),
        message: Set(req.notes.clone()),
        lien_public_token: Set(None),
        date_creation: Set(now),
        date_confirmation: Set(None),
        ..Default::default()
    }
    .insert(&state.db)
    .await?;

    let demandeur = user::Entity::find_by_id(auth.id).one(&state.db).await?;
    Ok(Json(Envelope {
        success: true,
        data: VisitResponse::build(model, Some(&listing), demandeur.as_ref()),
    }))
}

/// `GET /api/visits` — the caller's visits (as requester or owner), newest first.
async fn list(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<Envelope<VisitListResponse>>> {
    let visits = visit::Entity::find()
        .filter(mine(auth.id))
        .order_by_desc(visit::Column::DateVisite)
        .all(&state.db)
        .await?;
    let (listings, users) = hydrate(&state.db, &visits).await?;
    Ok(Json(Envelope { success: true, data: VisitListResponse { visits: to_responses(visits, &listings, &users) } }))
}

#[derive(Debug, serde::Serialize)]
struct VisitListResponse {
    visits: Vec<VisitResponse>,
}

/// `GET /api/visits/upcoming` — future pending/confirmed visits, soonest first.
async fn upcoming(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<Envelope<VisitListResponse>>> {
    let now = chrono::Utc::now().fixed_offset();
    let visits = visit::Entity::find()
        .filter(mine(auth.id))
        .filter(visit::Column::DateVisite.gte(now))
        .filter(visit::Column::Statut.is_in([StatutVisite::EnAttente, StatutVisite::Confirmee]))
        .order_by_asc(visit::Column::DateVisite)
        .all(&state.db)
        .await?;
    let (listings, users) = hydrate(&state.db, &visits).await?;
    Ok(Json(Envelope { success: true, data: VisitListResponse { visits: to_responses(visits, &listings, &users) } }))
}

/// `GET /api/visits/stats` — visit counts by status for the caller.
async fn stats(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<Envelope<VisitStats>>> {
    let visits = visit::Entity::find().filter(mine(auth.id)).all(&state.db).await?;
    let mut s = VisitStats { total: visits.len() as u64, en_attente: 0, confirmees: 0, completees: 0, annulees: 0 };
    for v in &visits {
        match v.statut {
            StatutVisite::EnAttente => s.en_attente += 1,
            StatutVisite::Confirmee => s.confirmees += 1,
            StatutVisite::Completee => s.completees += 1,
            StatutVisite::Annulee => s.annulees += 1,
        }
    }
    Ok(Json(Envelope { success: true, data: s }))
}

/// `GET /api/visits/{id}` — a single visit (caller must be a participant).
async fn get_one(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Envelope<VisitResponse>>> {
    let v = participant_visit(&state.db, id, auth.id).await?;
    let listing = listing::Entity::find_by_id(v.annonce_id).one(&state.db).await?;
    let demandeur = user::Entity::find_by_id(v.demandeur_id).one(&state.db).await?;
    Ok(Json(Envelope { success: true, data: VisitResponse::build(v, listing.as_ref(), demandeur.as_ref()) }))
}

/// `POST /api/visits/{id}/confirm` — the owner confirms a requested visit.
async fn confirm(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Envelope<VisitResponse>>> {
    let v = participant_visit(&state.db, id, auth.id).await?;
    if v.proprietaire_id != auth.id {
        return Err(AppError::Forbidden("Seul le propriétaire peut confirmer".into()));
    }
    set_statut(&state.db, v, StatutVisite::Confirmee, true).await
}

/// `POST /api/visits/{id}/complete` — mark a visit as completed.
async fn complete(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Envelope<VisitResponse>>> {
    let v = participant_visit(&state.db, id, auth.id).await?;
    set_statut(&state.db, v, StatutVisite::Completee, false).await
}

/// `POST /api/visits/{id}/cancel` — cancel a visit (either participant).
async fn cancel(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    body: Option<Json<CancelRequest>>,
) -> AppResult<Json<Envelope<VisitResponse>>> {
    let v = participant_visit(&state.db, id, auth.id).await?;
    let motif = body.and_then(|b| b.0.motif);
    let mut am: visit::ActiveModel = v.into();
    am.statut = Set(StatutVisite::Annulee);
    if let Some(m) = motif {
        am.message = Set(Some(m));
    }
    let updated = am.update(&state.db).await?;
    respond(&state.db, updated).await
}

/// `DELETE /api/visits/{id}` — remove a visit (either participant).
async fn destroy(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Envelope<serde_json::Value>>> {
    let v = participant_visit(&state.db, id, auth.id).await?;
    visit::Entity::delete_by_id(v.id).exec(&state.db).await?;
    Ok(Json(Envelope { success: true, data: serde_json::json!({ "message": "Visite supprimée" }) }))
}

// --- helpers ---------------------------------------------------------------

async fn participant_visit(
    db: &sea_orm::DatabaseConnection,
    id: Uuid,
    user_id: Uuid,
) -> AppResult<visit::Model> {
    let v = visit::Entity::find_by_id(id).one(db).await?.ok_or(AppError::NotFound)?;
    if v.demandeur_id != user_id && v.proprietaire_id != user_id {
        return Err(AppError::Forbidden("Vous ne participez pas à cette visite".into()));
    }
    Ok(v)
}

async fn set_statut(
    db: &sea_orm::DatabaseConnection,
    v: visit::Model,
    statut: StatutVisite,
    set_confirmation: bool,
) -> AppResult<Json<Envelope<VisitResponse>>> {
    let mut am: visit::ActiveModel = v.into();
    am.statut = Set(statut);
    if set_confirmation {
        am.date_confirmation = Set(Some(chrono::Utc::now().fixed_offset()));
    }
    let updated = am.update(db).await?;
    respond(db, updated).await
}

async fn respond(
    db: &sea_orm::DatabaseConnection,
    v: visit::Model,
) -> AppResult<Json<Envelope<VisitResponse>>> {
    let listing = listing::Entity::find_by_id(v.annonce_id).one(db).await?;
    let demandeur = user::Entity::find_by_id(v.demandeur_id).one(db).await?;
    Ok(Json(Envelope { success: true, data: VisitResponse::build(v, listing.as_ref(), demandeur.as_ref()) }))
}
// NOTE: by-date / forListing endpoints can be added later; the agenda uses list + stats.
