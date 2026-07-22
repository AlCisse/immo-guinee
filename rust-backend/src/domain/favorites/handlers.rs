//! Favorites — a user's saved listings.
//!
//! `list` returns the favourited listings (serialized as the listing shape the UI
//! normalizes, plus `added_at`). `toggle`/`add`/`remove`/`check` manage membership.

use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::{Path, State};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter, QueryOrder,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::db::entities::{favorite, listing};
use crate::error::{AppError, AppResult};
use crate::extractors::{AuthUser, ValidatedJson};
use crate::state::AppState;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/favorites", get(list).post(add))
        .route("/favorites/{listing_id}", delete(remove))
        .route("/favorites/{listing_id}/check", get(check))
        .route("/favorites/{listing_id}/toggle", post(toggle))
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct AddFavoriteRequest {
    pub listing_id: Uuid,
}

/// `GET /api/favorites` — the caller's saved listings, newest first.
async fn list(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<serde_json::Value>> {
    let favs = favorite::Entity::find()
        .filter(favorite::Column::UserId.eq(auth.id))
        .order_by_desc(favorite::Column::CreatedAt)
        .all(&state.db)
        .await?;

    let listing_ids: Vec<Uuid> = favs.iter().map(|f| f.listing_id).collect();
    let listings = if listing_ids.is_empty() {
        vec![]
    } else {
        listing::Entity::find().filter(listing::Column::Id.is_in(listing_ids)).all(&state.db).await?
    };
    let by_id: HashMap<Uuid, listing::Model> = listings.into_iter().map(|l| (l.id, l)).collect();

    // Serialize each listing (UI-normalized client-side) + the added_at timestamp.
    let items: Vec<serde_json::Value> = favs
        .into_iter()
        .filter_map(|f| {
            by_id.get(&f.listing_id).map(|l| {
                let mut v = serde_json::to_value(l).unwrap_or_else(|_| json!({}));
                if let Some(obj) = v.as_object_mut() {
                    obj.insert("added_at".into(), json!(f.created_at));
                }
                v
            })
        })
        .collect();

    Ok(Json(json!({ "success": true, "data": { "favorites": items } })))
}

/// `POST /api/favorites` — add a listing to favourites (idempotent).
async fn add(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<AddFavoriteRequest>,
) -> AppResult<Json<serde_json::Value>> {
    ensure_listing(&state.db, req.listing_id).await?;
    set_favorite(&state.db, auth.id, req.listing_id, true).await?;
    Ok(Json(json!({ "success": true, "data": { "is_favorite": true } })))
}

/// `DELETE /api/favorites/{listing_id}` — remove from favourites.
async fn remove(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(listing_id): Path<Uuid>,
) -> AppResult<Json<serde_json::Value>> {
    set_favorite(&state.db, auth.id, listing_id, false).await?;
    Ok(Json(json!({ "success": true, "data": { "is_favorite": false } })))
}

/// `GET /api/favorites/{listing_id}/check` — whether the caller saved this listing.
async fn check(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(listing_id): Path<Uuid>,
) -> AppResult<Json<serde_json::Value>> {
    let is_fav = existing(&state.db, auth.id, listing_id).await?.is_some();
    Ok(Json(json!({ "success": true, "data": { "is_favorite": is_fav } })))
}

/// `POST /api/favorites/{listing_id}/toggle` — flip favourite membership.
async fn toggle(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(listing_id): Path<Uuid>,
) -> AppResult<Json<serde_json::Value>> {
    let now_fav = match existing(&state.db, auth.id, listing_id).await? {
        Some(f) => {
            favorite::Entity::delete_by_id(f.id).exec(&state.db).await?;
            false
        }
        None => {
            ensure_listing(&state.db, listing_id).await?;
            insert(&state.db, auth.id, listing_id).await?;
            true
        }
    };
    Ok(Json(json!({ "success": true, "data": { "is_favorite": now_fav } })))
}

// --- helpers ---------------------------------------------------------------

async fn ensure_listing(db: &sea_orm::DatabaseConnection, id: Uuid) -> AppResult<()> {
    listing::Entity::find_by_id(id).one(db).await?.ok_or(AppError::NotFound)?;
    Ok(())
}

async fn existing(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
    listing_id: Uuid,
) -> AppResult<Option<favorite::Model>> {
    Ok(favorite::Entity::find()
        .filter(favorite::Column::UserId.eq(user_id))
        .filter(favorite::Column::ListingId.eq(listing_id))
        .one(db)
        .await?)
}

async fn insert(db: &sea_orm::DatabaseConnection, user_id: Uuid, listing_id: Uuid) -> AppResult<()> {
    favorite::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(user_id),
        listing_id: Set(listing_id),
        ..Default::default()
    }
    .insert(db)
    .await?;
    Ok(())
}

/// Add or remove the favourite, idempotently.
async fn set_favorite(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
    listing_id: Uuid,
    favorite: bool,
) -> AppResult<()> {
    match (existing(db, user_id, listing_id).await?, favorite) {
        (None, true) => insert(db, user_id, listing_id).await?,
        (Some(f), false) => {
            crate::db::entities::favorite::Entity::delete_by_id(f.id).exec(db).await?;
        }
        _ => {}
    }
    Ok(())
}
