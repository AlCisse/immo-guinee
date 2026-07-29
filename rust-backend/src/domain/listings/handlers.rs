//! Handlers for the public listings API (Phase 1, read-only).
//!
//! - `GET /api/listings/search` — filtered, paginated search (public, no auth).
//! - `GET /api/listings/{id}`  — public listing detail (404 when unknown/expired).

use std::sync::Arc;

use axum::body::Body;
use axum::extract::{DefaultBodyLimit, Multipart, Path, Query, State};
use axum::http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::Json;
use axum::Router;
use sea_orm::sea_query::Expr;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect,
};
use serde_json::json;
use uuid::Uuid;

use crate::db::entities::sea_orm_active_enums::StatutListing;
use crate::db::entities::{listing, user};
use crate::error::{AppError, AppResult};
use crate::extractors::{AuthUser, ValidatedJson};
use crate::services::{cache, listing_photo};
use crate::state::AppState;

use super::dto::{
    CreateListingRequest, Envelope, ListingResponse, ListingSearchResponse, ListingSummary,
    Pagination, PhotoUploadResponse, UpdateListingRequest,
};
use super::query::{apply_filters, normalize_pagination, ListingSearchQuery};

/// `Cache-Control` for public read endpoints: browser caches 30s, a shared CDN
/// 120s, and both may serve stale while revalidating for 10 min. Combined with
/// ETag/304 (detail) and Redis (search), re-navigation on 2G/3G costs ~200 bytes.
const CACHE_CONTROL_PUBLIC: &str = "public, max-age=30, s-maxage=120, stale-while-revalidate=600";

fn cache_headers() -> HeaderMap {
    let mut h = HeaderMap::new();
    h.insert(
        HeaderName::from_static("cache-control"),
        HeaderValue::from_static(CACHE_CONTROL_PUBLIC),
    );
    h
}

/// Invalidate the public search cache after any listing mutation (create, edit,
/// archive, reactivate, mark-as-rented, photo upload). Best-effort: a missed
/// bump only means up to 30s of stale results (the entry TTL), never corruption.
async fn invalidate_search_cache(state: &AppState) {
    let mut conn = state.redis.clone();
    cache::bump_search_version(&mut conn).await;
}

/// Photo uploads may carry up to 10 photos × 5 MB (FR-009); raise the body limit
/// for this route only (the global default stays modest).
const PHOTOS_BODY_LIMIT: usize = 55 * 1024 * 1024;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/listings/search", get(search))
        .route("/listings/my", get(my_listings))
        .route("/listings", post(create))
        .route("/listings/{id}", get(show).patch(update).delete(destroy))
        .route("/listings/{id}/mark-as-rented", post(mark_as_rented))
        .route("/listings/{id}/reactivate", post(reactivate))
        .route("/listings/{id}/contact", post(contact))
        .route(
            "/listings/{id}/photos",
            post(upload_photos).layer(DefaultBodyLimit::max(PHOTOS_BODY_LIMIT)),
        )
}

async fn search(
    State(state): State<Arc<AppState>>,
    Query(q): Query<ListingSearchQuery>,
) -> AppResult<Response> {
    let (page, per_page) = normalize_pagination(q.page, q.per_page);

    // Best-effort Redis hit: skip the DB entirely (no count(), no page fetch).
    let mut conn = state.redis.clone();
    // Generation in the key: any listing mutation bumps it → all stale entries
    // orphaned in O(1) (they expire on their own TTL), so writes never leak
    // outdated results into the cached search.
    let version = cache::search_version(&mut conn).await;
    let cache_key = format!(
        "cache:search:v{version}:p{page}:n{per_page}:{}",
        serde_json::to_string(&q).unwrap_or_default()
    );

    if let Some(bytes) = cache::get_bytes(&mut conn, &cache_key).await {
        if let Ok(data) = serde_json::from_slice::<ListingSearchResponse<ListingSummary>>(&bytes) {
            return Ok((cache_headers(), Json(Envelope { success: true, data })).into_response());
        }
    }

    let select = apply_filters(&q);
    let total = select.clone().count(&state.db).await?;
    let offset = ((page - 1) * per_page) as u64;
    let rows = select.offset(offset).limit(per_page as u64).all(&state.db).await?;

    let listings = rows.into_iter().map(ListingSummary::from).collect::<Vec<_>>();
    let total_pages = ((total as u32) + per_page - 1) / per_page;
    let data = ListingSearchResponse {
        listings,
        pagination: Pagination { page, per_page, total, total_pages },
    };

    // Warm the cache (30s TTL — short enough to stay fresh, long enough to absorb
    // a homepage/search burst). Failure is non-fatal.
    if let Ok(bytes) = serde_json::to_vec(&data) {
        cache::set_bytes(&mut conn, &cache_key, &bytes, 30).await;
    }

    Ok((cache_headers(), Json(Envelope { success: true, data })).into_response())
}

/// `GET /api/listings/my` — the authenticated caller's own listings (all statuses,
/// including archived/expired), newest first, paginated.
async fn my_listings(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Query(q): Query<ListingSearchQuery>,
) -> AppResult<Json<Envelope<ListingSearchResponse<ListingResponse>>>> {
    let (page, per_page) = normalize_pagination(q.page, q.per_page);
    let select = listing::Entity::find()
        .filter(listing::Column::CreateurId.eq(auth.id))
        .order_by_desc(listing::Column::DatePublication);

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
    req_headers: HeaderMap,
) -> AppResult<Response> {
    let model = listing::Entity::find_by_id(id).one(&state.db).await?;
    let model = model.ok_or(AppError::NotFound)?;
    // Public detail is for listings on the market or concluded via the platform.
    // Expired, archived (soft-deleted) and suspended (moderation) are hidden —
    // the owner still reaches theirs via `GET /listings/my`. `LoueVendu` is shown
    // as a concluded listing; `EnNegociation` is still an active listing.
    if matches!(model.statut, StatutListing::Expire | StatutListing::Archive | StatutListing::Suspendu) {
        return Err(AppError::NotFound);
    }

    // Weak ETag from the listing identity + last update — deliberately NOT
    // nombre_vues (which changes every view and would defeat 304s). Stable across
    // views, changes on edit/reactivate.
    let etag = format!(
        "W/\"{}-{}\"",
        id,
        model
            .date_derniere_maj
            .map(|d| d.timestamp())
            .unwrap_or_else(|| model.date_publication.timestamp())
    );

    // Conditional request: a 304 costs ~200 bytes on the wire instead of the full
    // listing JSON — the decisive win when re-navigating on 2G/3G.
    if let Some(if_none_match) = req_headers.get("if-none-match") {
        if if_none_match.as_bytes() == etag.as_bytes() {
            let mut h = cache_headers();
            if let Ok(v) = HeaderValue::from_str(&etag) {
                h.insert(HeaderName::from_static("etag"), v);
            }
            return Ok((StatusCode::NOT_MODIFIED, h, Body::empty()).into_response());
        }
    }

    let createur_id = model.createur_id;

    // Increment the view counter fire-and-forget: the GET stays non-mutating
    // (cacheable) and the response isn't blocked on a DB write. The displayed
    // count is still bumped optimistically below.
    {
        let db = state.db.clone();
        tokio::spawn(async move {
            let _ = listing::Entity::update_many()
                .col_expr(listing::Column::NombreVues, Expr::col(listing::Column::NombreVues).add(1))
                .filter(listing::Column::Id.eq(id))
                .exec(&db)
                .await;
        });
    }

    let mut data = ListingResponse::from(model);
    data.nombre_vues += 1;

    // Embed the owner so the detail page can show their name, badge and rating
    // (note_moyenne, maintained by the ratings domain).
    let owner = user::Entity::find_by_id(createur_id).one(&state.db).await?;
    let user_json = owner.map(|u| {
        json!({
            "id": u.id,
            "nom_complet": u.nom_complet,
            "badge": u.badge_certification,
            "note_moyenne": u.note_moyenne,
            "photo_profil_url": u.photo_profil_url,
        })
    });

    let mut body = serde_json::to_value(&data).unwrap_or_else(|_| json!({}));
    if let Some(obj) = body.as_object_mut() {
        obj.insert("user".into(), user_json.unwrap_or(serde_json::Value::Null));
    }

    let mut resp_headers = cache_headers();
    if let Ok(v) = HeaderValue::from_str(&etag) {
        resp_headers.insert(HeaderName::from_static("etag"), v);
    }
    Ok((resp_headers, Json(json!({ "success": true, "data": body }))).into_response())
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

    invalidate_search_cache(&state).await;
    Ok(Json(Envelope { success: true, data: ListingResponse::from(model) }))
}

/// `POST /api/listings/{id}/photos` — upload photos (owner only, max 10). Each
/// file is optimized to 3 WebP renditions and pushed to `listings.photos`.
///
/// `photos` is a read-modify-write on a JSON array, so two parallel uploads for
/// the same listing would last-writer-wins and silently drop renditions. A
/// per-listing Redis mutex (random token + compare-and-delete release) serializes
/// the read → append → rewrite across requests. TTL is generous (up to 10 files ×
/// 3 S3 puts); the token-based release makes a TTL expiry safe (never deletes a
/// concurrent holder's lock).
async fn upload_photos(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    multipart: Multipart,
) -> AppResult<Json<Envelope<PhotoUploadResponse>>> {
    let lock_key = format!("lock:listing-photos:{id}");
    let token = crate::services::redis_atomic::acquire_lock(&state.redis, &lock_key, 120)
        .await?
        .ok_or_else(|| {
            AppError::Conflict("un envoi de photos est déjà en cours pour cette annonce".into())
        })?;
    let result = upload_photos_locked(&state, auth.id, id, multipart).await;
    let _ = crate::services::redis_atomic::release_lock(&state.redis, &lock_key, &token).await;
    result
}

async fn upload_photos_locked(
    state: &AppState,
    auth_id: Uuid,
    id: Uuid,
    mut multipart: Multipart,
) -> AppResult<Json<Envelope<PhotoUploadResponse>>> {
    let listing = listing::Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;
    if listing.createur_id != auth_id {
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

        // Lanczos3 resize is CPU-bound (up to seconds on a large photo) — run it
        // on a blocking thread so concurrent uploads/requests cannot stall the
        // async reactor (the 60s timeout cannot cancel work on the async thread).
        let renditions = match tokio::task::spawn_blocking(move || listing_photo::optimize(&bytes)).await {
            Ok(Ok(r)) => r,
            Ok(Err(e)) => return Err(e),
            Err(e) => return Err(AppError::Internal(anyhow::anyhow!("photo optimize task: {e}"))),
        };

        let mut urls = serde_json::Map::new();
        for r in renditions {
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
    invalidate_search_cache(&state).await;

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
    invalidate_search_cache(&state).await;
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
    invalidate_search_cache(&state).await;

    Ok(Json(Envelope { success: true, data: json!({ "message": "Annonce archivée" }) }))
}

/// `POST /api/listings/{id}/mark-as-rented` — owner marks the listing rented/sold
/// (statut → LOUE_VENDU). Any request body (e.g. `rented_via_immoguinee`) is ignored;
/// the model has no such field yet.
async fn mark_as_rented(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Envelope<ListingResponse>>> {
    let listing = owned_listing(&state.db, id, auth.id).await?;
    let mut am: listing::ActiveModel = listing.into();
    am.statut = Set(StatutListing::LoueVendu);
    am.date_derniere_maj = Set(Some(chrono::Utc::now().fixed_offset()));
    let updated = am.update(&state.db).await?;
    invalidate_search_cache(&state).await;
    Ok(Json(Envelope { success: true, data: ListingResponse::from(updated) }))
}

/// `POST /api/listings/{id}/reactivate` — owner reactivates an expired/archived/rented
/// listing (statut → DISPONIBLE, expiry extended by 90 days, FR-014).
async fn reactivate(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Envelope<ListingResponse>>> {
    let listing = owned_listing(&state.db, id, auth.id).await?;
    let now = chrono::Utc::now();
    let mut am: listing::ActiveModel = listing.into();
    am.statut = Set(StatutListing::Disponible);
    am.date_expiration = Set((now + chrono::Duration::days(90)).fixed_offset());
    am.date_derniere_maj = Set(Some(now.fixed_offset()));
    let updated = am.update(&state.db).await?;
    invalidate_search_cache(&state).await;
    Ok(Json(Envelope { success: true, data: ListingResponse::from(updated) }))
}

/// Contact payload (message from the interested user to the owner).
#[derive(Debug, serde::Deserialize, validator::Validate)]
struct ContactRequest {
    #[validate(length(min = 1, max = 1000, message = "message requis (1-1000 caractères)"))]
    message: String,
}

/// `POST /api/listings/{id}/contact` — an interested user contacts the owner. At this
/// stage messaging routes through WhatsApp: the backend sends the owner a WhatsApp
/// message (via Evolution API) with the requester's contact, keeping numbers masked
/// on the site (FR-060). The owner replies directly.
async fn contact(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<ContactRequest>,
) -> AppResult<Json<Envelope<serde_json::Value>>> {
    let listing = listing::Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;
    if listing.createur_id == auth.id {
        return Err(AppError::Validation("Vous ne pouvez pas contacter votre propre annonce".into()));
    }
    let owner = user::Entity::find_by_id(listing.createur_id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;
    let client = user::Entity::find_by_id(auth.id)
        .one(&state.db)
        .await?
        .ok_or(AppError::Unauthorized)?;

    let text = format!(
        "📩 ImmoGuinée — Nouveau contact pour votre annonce « {titre} ».\n\n\
         Client : {nom} ({tel})\n\
         Message : {msg}\n\n\
         Répondez directement au client.",
        titre = listing.titre,
        nom = client.nom_complet,
        tel = client.telephone,
        msg = req.message.trim(),
    );
    // Delivery failure must not fail the request (dev logs; prod sends via Evolution).
    if let Err(e) = crate::services::notify::send_direct(&state, &owner.telephone, &text).await {
        tracing::warn!(error = %e, "contact WhatsApp au propriétaire échoué");
    }

    Ok(Json(Envelope {
        success: true,
        data: json!({ "message": "Le propriétaire a été notifié via WhatsApp", "channel": "whatsapp" }),
    }))
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