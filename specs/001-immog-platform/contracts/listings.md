# API Contract: Listings (Annonces Immobilières) — Rust / Axum

**Domain**: Real Estate Listings CRUD, Search, Photo Upload
**Base URL**: `/api/listings`
**Version**: 1.0
**Backend**: Rust (Axum) — SeaORM + PostgreSQL search, S3 photo storage
**Status**: ✅ Implemented (`src/domain/listings/`)

---

## Overview

Create, read, update, search and archive listings; upload photos (optimized to
WebP). Public search and detail need no auth; write operations require the owner.

**Key requirements**: FR-006 (fast publish), FR-007 (7 property types), FR-008
(pre-defined quartiers), FR-009 (photos ≤ 5 MB), FR-010 (WebP ×3), FR-011 (mandatory
fields), FR-013 (immutable prix/quartier/type), FR-014 (auto-expiry 90 days),
FR-016 (public search), FR-017 (filters), FR-019 (pagination).

> **Note (design vs the earlier Laravel draft)**:
> - **Search uses PostgreSQL** (SeaORM filters + ILIKE on titre/description, GIN
>   index available). Elasticsearch is a planned relevance/perf upgrade (T092).
> - **Create takes a JSON body without photos**; photos are uploaded via a separate
>   multipart endpoint `POST /listings/{id}/photos` (decoupled, owner-only).
> - **Detail increments the view counter** (no separate `/views` endpoint).
> - `GET /listings/me`, `reactivate`, and `premium` are **planned** (premium depends
>   on Payments, Phase 4). Auto-expiry is a planned apalis scheduled job.

---

## Axum Routes (`domain::listings::routes`)

```rust
Router::new()
    .route("/listings/search", get(search))                 // public
    .route("/listings", post(create))                       // AuthUser
    .route("/listings/{id}", get(show).patch(update).delete(destroy))
    .route("/listings/{id}/photos",
           post(upload_photos).layer(DefaultBodyLimit::max(55 * 1024 * 1024))) // AuthUser (owner)
// mounted under /api
```

Responses use `{ "success": true, "data": ... }`.

---

## Endpoints

### 1. Create listing — `POST /api/listings` (auth)

Creates a listing owned by the caller (statut DISPONIBLE, expiration = +90 days,
`photos: []`). Validated by `ValidatedJson<CreateListingRequest>`.

**Request** (JSON):
```json
{
  "type_operation": "LOCATION",
  "type_bien": "APPARTEMENT",
  "titre": "Bel appartement 2 chambres vue mer",
  "description": "Magnifique appartement situé à Kaloum, proche commodités.",
  "prix_gnf": 2500000,
  "quartier": "KALOUM",
  "adresse_complete": "Avenue de la République, Kaloum",
  "superficie_m2": 85,
  "nombre_chambres": 2,
  "nombre_salons": 1,
  "caution_mois": 3,
  "equipements": ["Climatisation", "Eau courante"]
}
```

**Validation** (`CreateListingRequest`): `type_operation` ∈ {LOCATION, VENTE};
`type_bien` ∈ 7 types; `titre` 5–100; `description` 20–2000; `prix_gnf` ≥ 1;
`quartier` ∈ 9 quartiers; `caution_mois` 1–6; others optional. *(FR-011 states
titre 50–100 / description 200–2000; pragmatic minimums are used — see spec note.)*

**Response** (200): `data` = the created listing (see the listing shape below).

```rust
async fn create(auth: AuthUser, State(state), ValidatedJson(req): ValidatedJson<CreateListingRequest>)
    -> AppResult<Json<Envelope<ListingResponse>>> {
    let expiration = (chrono::Utc::now() + chrono::Duration::days(90)).fixed_offset();
    let model = listing::ActiveModel { id: Set(Uuid::new_v4()), createur_id: Set(auth.id), /* .. */,
        date_expiration: Set(expiration), ..Default::default() }.insert(&state.db).await?;
    Ok(Json(Envelope { success: true, data: ListingResponse::from(model) }))
}
```

**Errors**: 400 (validation), 401 (no token).

---

### 2. Upload photos — `POST /api/listings/{id}/photos` (auth, owner)

Multipart upload (up to 10 files). Each file is decoded, optimized to **3 WebP
renditions** (thumbnail 200×150, medium 800×600, large 1920×1440) and stored in S3;
their URLs are pushed into `listings.photos` (JSONB). Route body limit: 55 MB.

**Request**: `multipart/form-data` with one or more `photo` file parts.

**Response** (200):
```json
{
  "success": true,
  "data": {
    "count": 1,
    "photos": [
      {
        "thumbnail": "http://minio/immoguinee-images/listings/{id}/{uuid}-thumbnail.webp",
        "medium":    "http://minio/immoguinee-images/listings/{id}/{uuid}-medium.webp",
        "large":     "http://minio/immoguinee-images/listings/{id}/{uuid}-large.webp"
      }
    ]
  }
}
```

```rust
async fn upload_photos(auth: AuthUser, State(state), Path(id), mut multipart: Multipart) -> AppResult<...> {
    let listing = owned_listing(&state.db, id, auth.id).await?;        // 404 / 403
    let mut photos = listing.photos.as_array().cloned().unwrap_or_default();
    while let Some(field) = multipart.next_field().await? {
        if photos.len() >= 10 { return Err(AppError::Validation("Maximum 10 photos".into())); }
        let bytes = field.bytes().await?;
        let mut urls = serde_json::Map::new();
        for r in listing_photo::optimize(&bytes)? {                    // 3 WebP renditions
            let key = format!("listings/{id}/{}-{}.webp", Uuid::new_v4(), r.label);
            urls.insert(r.label.to_string(), json!(state.storage.put(&key, &r.webp, "image/webp").await?));
        }
        photos.push(Value::Object(urls));
    }
    /* update listings.photos, return count + photos */
}
```

**Errors**: 400 (unreadable image / > 10 photos), 401, 403 (not owner), 404.

---

### 3. Listing detail — `GET /api/listings/{id}` (public)

Returns the listing and **atomically increments `nombre_vues`**.

**Response** (200): `data` = the listing:
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "createur_id": "uuid-v4",
    "type_operation": "LOCATION",
    "type_bien": "APPARTEMENT",
    "titre": "Bel appartement 2 chambres vue mer",
    "description": "…",
    "prix_gnf": 2500000,
    "quartier": "KALOUM",
    "adresse_complete": "Avenue de la République, Kaloum",
    "superficie_m2": 85,
    "nombre_chambres": 2,
    "nombre_salons": 1,
    "caution_mois": 3,
    "equipements": ["Climatisation", "Eau courante"],
    "photos": [ { "thumbnail": "…", "medium": "…", "large": "…" } ],
    "statut": "DISPONIBLE",
    "nombre_vues": 151,
    "options_premium": { "badge_urgent": false, "remontee_48h": false, "photos_pro": false },
    "date_publication": "2025-01-28T14:30:00Z",
    "date_expiration": "2025-04-28T14:30:00Z"
  }
}
```

**Errors**: 404 (unknown id).

---

### 4. Search — `GET /api/listings/search` (public)

Filtered, paginated search over `DISPONIBLE` listings (FR-016/017/019), ordered by
`date_publication` desc. Free-text `q` runs an ILIKE on titre + description.

**Query params** (`ListingSearchQuery`, all optional):
```
?type_operation=LOCATION
&type_bien=APPARTEMENT
&quartier=KALOUM
&prix_min=2000000
&prix_max=3000000
&nombre_chambres=2      # minimum
&q=vue mer
&page=1
&per_page=20            # clamped to 1..=50 (default 20)
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "listings": [ { /* listing shape as in detail */ } ],
    "pagination": { "page": 1, "per_page": 20, "total": 156, "total_pages": 8 }
  }
}
```

```rust
async fn search(State(state), Query(q): Query<ListingSearchQuery>) -> AppResult<...> {
    let (page, per_page) = normalize_pagination(q.page, q.per_page);
    let select = apply_filters(&q);                       // Statut=DISPONIBLE + optional filters
    let total = select.clone().count(&state.db).await?;
    let rows = select.offset(((page - 1) * per_page) as u64).limit(per_page as u64).all(&state.db).await?;
    /* map rows -> ListingResponse, compute total_pages */
}
```

---

### 5. Update — `PATCH /api/listings/{id}` (auth, owner)

Edits `titre` / `description` only (FR-013 — prix, quartier, type_bien are immutable;
photos have their own endpoint). Sets `date_derniere_maj`.

**Request** (JSON, both optional):
```json
{ "titre": "Nouveau titre", "description": "Nouvelle description détaillée du bien." }
```

**Response** (200): the updated listing.

**Errors**: 400 (validation), 401, 403 (not owner), 404.

---

### 6. Delete — `DELETE /api/listings/{id}` (auth, owner)

Soft delete: sets `statut = ARCHIVE` (leaves public search, kept for history).

**Response** (200):
```json
{ "success": true, "data": { "message": "Annonce archivée" } }
```

**Errors**: 401, 403 (not owner), 404.

---

## Ownership helper

```rust
async fn owned_listing(db, id: Uuid, user_id: Uuid) -> AppResult<listing::Model> {
    let l = listing::Entity::find_by_id(id).one(db).await?.ok_or(AppError::NotFound)?;
    if l.createur_id != user_id { return Err(AppError::Forbidden("…pas le propriétaire…".into())); }
    Ok(l)
}
```

---

## Planned endpoints

- `GET /api/listings/me` — the caller's listings + status stats.
- `POST /api/listings/{id}/reactivate` — extend expiry by 90 days (EXPIRE → DISPONIBLE).
- `POST /api/listings/{id}/premium` — badge URGENT / remontée 48h / photos pro (FR-015);
  **depends on Payments (Phase 4)** — paid feature.
- **Auto-expiry** — an apalis scheduled job marks DISPONIBLE listings past
  `date_expiration` as EXPIRE (FR-014).

---

## Rate limiting

Public (search, detail): `limit_public_ip` (100/min/IP). Authenticated (create,
update, delete, photos): `limit_user` (60/min/user). See `middleware::rate_limit`.

---

## Testing

Covered end-to-end by `tests/listings_e2e.rs` (Postgres + Redis + MinIO via
testcontainers): create → search → detail (view counter) → PATCH → DELETE, plus a
photo-upload test asserting 3 WebP renditions land in MinIO.

**Checklist**:
- [x] Authenticated create → statut DISPONIBLE, expiry +90 days
- [x] Public search with filters + pagination (Postgres)
- [x] Detail increments the view counter
- [x] Photo upload → 3 WebP renditions in S3
- [x] Owner-only PATCH (titre/description) and DELETE (→ ARCHIVE)
- [x] Archived listing leaves public search
- [ ] Auto-expiry job (planned — apalis)
- [ ] Elasticsearch search (planned — relevance/perf)
- [ ] Premium purchase (planned — Payments)

---

**Contract Status**: ✅ Implemented (Rust / Axum, PostgreSQL search + S3 photos)
**Next Contract**: `contracts.md` (Contract Generation & Signatures)
