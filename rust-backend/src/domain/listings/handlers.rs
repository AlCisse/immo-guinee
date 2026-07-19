//! Handlers for the public listings API (Phase 1, read-only).
//!
//! - `GET /api/listings/search` — filtered, paginated search (public, no auth).
//! - `GET /api/listings/{id}`  — public listing detail (404 when unknown/expired).

use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::routing::get;
use axum::Json;
use axum::Router;
use sea_orm::{EntityTrait, PaginatorTrait, QuerySelect};
use uuid::Uuid;

use crate::db::entities::listing;
use crate::error::{AppError, AppResult};
use crate::state::AppState;

use super::dto::{Envelope, ListingResponse, ListingSearchResponse, Pagination};
use super::query::{apply_filters, normalize_pagination, ListingSearchQuery};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/listings/search", get(search))
        .route("/listings/{id}", get(show))
}

async fn search(
    State(state): State<Arc<AppState>>,
    Query(q): Query<ListingSearchQuery>,
) -> AppResult<Json<Envelope<ListingSearchResponse>>> {
    let (page, per_page) = normalize_pagination(q.page, q.per_page);
    let select = apply_filters(&q);

    let total = select.clone().count(&state.db).await?;
    let offset = ((page - 1) * per_page) as u64;
    let rows = select.offset(offset).limit(per_page as u64).all(&state.db).await?;

    let listings = rows.into_iter().map(ListingResponse::from).collect::<Vec<_>>();
    let total_pages = ((total as u32) + per_page - 1) / per_page;

    Ok(Json(Envelope {
        success: true,
        data: ListingSearchResponse {
            listings,
            pagination: Pagination { page, per_page, total, total_pages },
        },
    }))
}

async fn show(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Envelope<ListingResponse>>> {
    let model = listing::Entity::find_by_id(id).one(&state.db).await?;
    let model = model.ok_or(AppError::NotFound)?;
    Ok(Json(Envelope { success: true, data: ListingResponse::from(model) }))
}