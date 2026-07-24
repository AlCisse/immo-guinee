//! Ratings & reviews (US7).
//!
//! - `GET /api/users/{id}/ratings` — published reviews received by a user, newest
//!   first, each with its author (evaluateur) name + badge.
//! - `GET /api/users/{id}/ratings/stats` — average, total, 1–5 distribution and
//!   per-criterion averages.
//! - `POST /api/ratings` — leave a review for the counterparty of a completed
//!   transaction the caller took part in. One review per transaction (schema
//!   `transaction_id UNIQUE`). On success the reviewee's `note_moyenne` is
//!   recomputed over published reviews.
//!
//! No content-moderation queue yet: a new review is auto-published
//! (`statut_moderation = APPROUVE`) so it counts immediately. Basic keyword
//! moderation can be layered on later (the `mots_cles_detectes` column is ready).

use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::{Path, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter, QueryOrder,
};
use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::db::entities::sea_orm_active_enums::StatutVerificationDoc;
use crate::db::entities::{rating, transaction, user};
use crate::error::{AppError, AppResult};
use crate::extractors::{AuthUser, ValidatedJson};
use crate::state::AppState;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/users/{id}/ratings", get(list_for_user))
        .route("/users/{id}/ratings/stats", get(stats_for_user))
        .route("/ratings", post(create))
}

/// Payload for `POST /api/ratings`. `note` and the three criteria are 1–5.
#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateRatingRequest {
    pub transaction_id: Uuid,
    #[validate(range(min = 1, max = 5))]
    pub note_globale: i16,
    #[validate(range(min = 1, max = 5))]
    pub critere_1_note: i16,
    #[validate(range(min = 1, max = 5))]
    pub critere_2_note: i16,
    #[validate(range(min = 1, max = 5))]
    pub critere_3_note: i16,
    #[validate(length(min = 1, max = 500))]
    pub commentaire: String,
}

/// `GET /api/users/{id}/ratings` — published reviews received by `id`, newest first.
async fn list_for_user(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let ratings = rating::Entity::find()
        .filter(rating::Column::EvalueId.eq(user_id))
        .filter(rating::Column::StatutModeration.eq(StatutVerificationDoc::Approuve))
        .order_by_desc(rating::Column::DateCreation)
        .all(&state.db)
        .await?;

    let authors = load_authors(&state.db, &ratings).await?;
    let items: Vec<Value> = ratings.iter().map(|r| rating_json(r, &authors)).collect();

    Ok(Json(json!({ "success": true, "data": items })))
}

/// `GET /api/users/{id}/ratings/stats` — aggregate view over published reviews.
async fn stats_for_user(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let ratings = rating::Entity::find()
        .filter(rating::Column::EvalueId.eq(user_id))
        .filter(rating::Column::StatutModeration.eq(StatutVerificationDoc::Approuve))
        .all(&state.db)
        .await?;

    let total = ratings.len();
    let mut distribution = [0u32; 5]; // index 0 => 1 star … index 4 => 5 stars
    let (mut sum_note, mut sum_c1, mut sum_c2, mut sum_c3) = (0i64, 0i64, 0i64, 0i64);
    for r in &ratings {
        let star = r.note_globale.clamp(1, 5) as usize;
        distribution[star - 1] += 1;
        sum_note += r.note_globale as i64;
        sum_c1 += r.critere_1_note as i64;
        sum_c2 += r.critere_2_note as i64;
        sum_c3 += r.critere_3_note as i64;
    }
    let avg = |sum: i64| if total == 0 { 0.0 } else { round1(sum as f64 / total as f64) };

    Ok(Json(json!({
        "success": true,
        "data": {
            "average": avg(sum_note),
            "total": total,
            "distribution": {
                "1": distribution[0], "2": distribution[1], "3": distribution[2],
                "4": distribution[3], "5": distribution[4]
            },
            "criteria": {
                "communication": avg(sum_c1),
                "ponctualite": avg(sum_c2),
                "proprete": avg(sum_c3),
                "respect_contrat": avg(sum_c3)
            }
        }
    })))
}

/// `POST /api/ratings` — review the counterparty of a completed transaction.
async fn create(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<CreateRatingRequest>,
) -> AppResult<Json<Value>> {
    let txn = transaction::Entity::find_by_id(req.transaction_id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;

    // The caller must be a party to the transaction; the reviewee is the other party.
    let evalue_id = if txn.proprietaire_id == auth.id {
        txn.locataire_acheteur_id
    } else if txn.locataire_acheteur_id == auth.id {
        txn.proprietaire_id
    } else {
        return Err(AppError::Forbidden(
            "Vous n'avez pas participé à cette transaction".into(),
        ));
    };

    // One review per transaction (schema enforces uniqueness; check first for a
    // friendly 409 instead of a raw DB error).
    if rating::Entity::find()
        .filter(rating::Column::TransactionId.eq(req.transaction_id))
        .one(&state.db)
        .await?
        .is_some()
    {
        return Err(AppError::Conflict("Cette transaction a déjà été évaluée".into()));
    }

    let now = Utc::now().into();
    rating::ActiveModel {
        id: Set(Uuid::new_v4()),
        evaluateur_id: Set(auth.id),
        evalue_id: Set(evalue_id),
        transaction_id: Set(req.transaction_id),
        note_globale: Set(req.note_globale),
        critere_1_note: Set(req.critere_1_note),
        critere_2_note: Set(req.critere_2_note),
        critere_3_note: Set(req.critere_3_note),
        commentaire: Set(req.commentaire),
        statut_moderation: Set(StatutVerificationDoc::Approuve),
        mots_cles_detectes: Set(json!([])),
        date_creation: Set(now),
        date_publication: Set(Some(now)),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(&state.db)
    .await?;

    recompute_note_moyenne(&state.db, evalue_id).await?;

    Ok(Json(json!({ "success": true, "data": { "evalue_id": evalue_id } })))
}

// --- helpers ---------------------------------------------------------------

/// Recompute a user's average rating over their published reviews and persist it.
async fn recompute_note_moyenne(db: &sea_orm::DatabaseConnection, user_id: Uuid) -> AppResult<()> {
    let ratings = rating::Entity::find()
        .filter(rating::Column::EvalueId.eq(user_id))
        .filter(rating::Column::StatutModeration.eq(StatutVerificationDoc::Approuve))
        .all(db)
        .await?;

    let avg = if ratings.is_empty() {
        0.0
    } else {
        let sum: i64 = ratings.iter().map(|r| r.note_globale as i64).sum();
        round1(sum as f64 / ratings.len() as f64) as f32
    };

    if let Some(u) = user::Entity::find_by_id(user_id).one(db).await? {
        let mut active: user::ActiveModel = u.into();
        active.note_moyenne = Set(avg);
        active.update(db).await?;
    }
    Ok(())
}

/// Fetch the authors (evaluateurs) for a batch of ratings, keyed by id.
async fn load_authors(
    db: &sea_orm::DatabaseConnection,
    ratings: &[rating::Model],
) -> AppResult<HashMap<Uuid, user::Model>> {
    let ids: Vec<Uuid> = ratings.iter().map(|r| r.evaluateur_id).collect();
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    let users = user::Entity::find().filter(user::Column::Id.is_in(ids)).all(db).await?;
    Ok(users.into_iter().map(|u| (u.id, u)).collect())
}

/// Shape a rating (+ its author) for the client, which normalizes field names.
fn rating_json(r: &rating::Model, authors: &HashMap<Uuid, user::Model>) -> Value {
    let author = authors.get(&r.evaluateur_id).map(|u| {
        json!({
            "id": u.id,
            "nom_complet": u.nom_complet,
            "badge": u.badge_certification,
        })
    });
    json!({
        "id": r.id,
        "evaluateur_id": r.evaluateur_id,
        "evalue_id": r.evalue_id,
        "transaction_id": r.transaction_id,
        "note_globale": r.note_globale,
        "critere_1_note": r.critere_1_note,
        "critere_2_note": r.critere_2_note,
        "critere_3_note": r.critere_3_note,
        "commentaire": r.commentaire,
        "date_creation": r.date_creation,
        "created_at": r.created_at,
        "evaluateur": author,
    })
}

/// Round to one decimal place.
fn round1(x: f64) -> f64 {
    (x * 10.0).round() / 10.0
}
