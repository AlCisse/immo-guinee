//! Handlers for the public listings API (Phase 1, read-only).
//!
//! - `GET /api/listings/search` — filtered, paginated search (public, no auth).
//! - `GET /api/listings/{id}`  — public listing detail (404 when unknown/expired).

use std::sync::Arc;

use axum::extract::{DefaultBodyLimit, Multipart, Path, Query, State};
use axum::routing::{get, post};
use axum::Json;
use axum::Router;
use sea_orm::sea_query::Expr;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter,
    QuerySelect,
};
use serde_json::json;
use uuid::Uuid;

use crate::db::entities::listing;
use crate::db::entities::sea_orm_active_enums::StatutListing;
use crate::error::{AppError, AppResult};
use crate::extractors::{AuthUser, ValidatedJson};
use crate::services::listing_photo;
use crate::state::AppState;

use super::dto::{
    CreateListingRequest, Envelope, ListingResponse, ListingSearchResponse, Pagination,
    PhotoUploadResponse, UpdateListingRequest,
};
use super::query::{apply_filters, normalize_pagination, ListingSearchQuery};

/// Photo uploads may carry up to 10 photos × 5 MB (FR-009); raise the body limit
/// for this route only (the global default stays modest).
const PHOTOS_BODY_LIMIT: usize = 55 * 1024 * 1024;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/listings/search", get(search))
        .route("/listings", post(create))
        .route("/listings/{id}", get(show).patch(update).delete(destroy))
        .route(
            "/listings/{id}/photos",
            post(upload_photos).layer(DefaultBodyLimit::max(PHOTOS_BODY_LIMIT)),
        )
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

    // Increment the view counter (FR: nombre_vues) atomically in the DB.
    listing::Entity::update_many()
        .col_expr(listing::Column::NombreVues, Expr::col(listing::Column::NombreVues).add(1))
        .filter(listing::Column::Id.eq(id))
        .exec(&state.db)
        .await?;

    let mut data = ListingResponse::from(model);
    data.nombre_vues += 1;
    Ok(Json(Envelope { success: true, data }))
}

/// `POST /api/listings` — create a listing owned by the authenticated user
/// (statut DISPONIBLE, expiration +90 days, no photos yet).
async fn create(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<CreateListingRequest>,
) -> AppResult<Json<Envelope<ListingResponse>>> {
    let expiration = (chrono::Utc::now() + chrono::Duration::days(90)).fixed_offset();

    let model = listing::ActiveModel {
        id: Set(Uuid::new_v4()),
        createur_id: Set(auth.id),
        type_operation: Set(req.type_operation),
        type_bien: Set(req.type_bien),
        titre: Set(req.titre),
        description: Set(req.description),
        prix_gnf: Set(req.prix_gnf),
        quartier: Set(req.quartier),
        adresse_complete: Set(req.adresse_complete),
        superficie_m2: Set(req.superficie_m2),
        nombre_chambres: Set(req.nombre_chambres),
        nombre_salons: Set(req.nombre_salons),
        caution_mois: Set(req.caution_mois),
        equipements: Set(json!(req.equipements.unwrap_or_default())),
        date_expiration: Set(expiration),
        ..Default::default()
    }
    .insert(&state.db)
    .await?;

    Ok(Json(Envelope { success: true, data: ListingResponse::from(model) }))
}

/// `POST /api/listings/{id}/photos` — upload photos (owner only, max 10). Each
/// file is optimized to 3 WebP renditions and pushed to `listings.photos`.
async fn upload_photos(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    mut multipart: Multipart,
) -> AppResult<Json<Envelope<PhotoUploadResponse>>> {
    let listing = listing::Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;
    if listing.createur_id != auth.id {
        return Err(AppError::Forbidden("Vous n'êtes pas le propriétaire de cette annonce".into()));
    }

    let mut photos: Vec<serde_json::Value> = listing.photos.as_array().cloned().unwrap_or_default();

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::Validation(format!("upload invalide: {e}")))?
    {
        if photos.len() >= 10 {
            return Err(AppError::Validation("Maximum 10 photos par annonce".into()));
        }
        let bytes = field
            .bytes()
            .await
            .map_err(|e| AppError::Validation(format!("lecture du fichier: {e}")))?;

        let mut urls = serde_json::Map::new();
        for r in listing_photo::optimize(&bytes)? {
            let key = format!("listings/{id}/{}-{}.webp", Uuid::new_v4(), r.label);
            let url = state.storage.put(&key, &r.webp, "image/webp").await?;
            urls.insert(r.label.to_string(), json!(url));
        }
        photos.push(serde_json::Value::Object(urls));
    }

    let count = photos.len();
    let photos_json = json!(photos);
    let mut am: listing::ActiveModel = listing.into();
    am.photos = Set(photos_json.clone());
    am.update(&state.db).await?;

    Ok(Json(Envelope { success: true, data: PhotoUploadResponse { count, photos: photos_json } }))
}

/// `PATCH /api/listings/{id}` — owner-only edit of titre / description (FR-013).
async fn update(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateListingRequest>,
) -> AppResult<Json<Envelope<ListingResponse>>> {
    let listing = owned_listing(&state.db, id, auth.id).await?;

    let mut am: listing::ActiveModel = listing.into();
    if let Some(titre) = req.titre {
        am.titre = Set(titre);
    }
    if let Some(description) = req.description {
        am.description = Set(description);
    }
    am.date_derniere_maj = Set(Some(chrono::Utc::now().fixed_offset()));

    let updated = am.update(&state.db).await?;
    Ok(Json(Envelope { success: true, data: ListingResponse::from(updated) }))
}

/// `DELETE /api/listings/{id}` — owner-only soft delete (statut → ARCHIVE).
async fn destroy(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Envelope<serde_json::Value>>> {
    let listing = owned_listing(&state.db, id, auth.id).await?;

    let mut am: listing::ActiveModel = listing.into();
    am.statut = Set(StatutListing::Archive);
    am.update(&state.db).await?;

    Ok(Json(Envelope { success: true, data: json!({ "message": "Annonce archivée" }) }))
}

/// Fetch a listing and ensure `user_id` owns it (`404` if missing, `403` if not owner).
async fn owned_listing(
    db: &sea_orm::DatabaseConnection,
    id: Uuid,
    user_id: Uuid,
) -> AppResult<listing::Model> {
    let listing = listing::Entity::find_by_id(id).one(db).await?.ok_or(AppError::NotFound)?;
    if listing.createur_id != user_id {
        return Err(AppError::Forbidden("Vous n'êtes pas le propriétaire de cette annonce".into()));
    }
    Ok(listing)
}