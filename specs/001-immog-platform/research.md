# Research & Technology Decisions: ImmoGuinée Platform (Rust + Next.js)

**Feature**: ImmoGuinée - Plateforme Immobilière pour la Guinée
**Branch**: `001-immog-platform`
**Date**: 2025-01-28 (Updated with the Rust stack)
**Phase**: 0 (Research)

---

## Executive Summary

This document resolves all technology decisions for the ImmoGuinée platform with a
**decoupled API-first architecture**: **Rust (Axum + Tokio) backend** + Next.js 14
frontend. The site is greenfield (not yet in production), so this is a **full-Rust
build** — no Laravel cohabitation, no strangler-fig migration.

**Key Architectural Decision**: Separate backend (Rust REST/WS API) and frontend
(Next.js PWA) for:
- **Scalability**: independent horizontal scaling of API and UI.
- **Performance & cost**: Rust's async runtime (Tokio) sustains high throughput at a
  fraction of the memory of a PHP-FPM/Octane fleet — decisive for a low-bandwidth,
  cost-sensitive Guinean market.
- **Safety**: the type system + ownership model eliminate whole classes of bugs
  (null, data races, injection when using a typed query builder) at compile time.
- **Mobile Apps**: future React Native / Flutter apps consume the same API.

**Key Decisions** (Rust stack):
- **Backend**: Rust **edition 2024** (rust-version **1.85+**), **Axum 0.8** (Tokio, Tower).
- **Frontend**: Next.js 14 App Router, React 18, TypeScript, TailwindCSS (unchanged).
- **Database**: PostgreSQL 16 with **SeaORM 1.1** (on SQLx), native PG enums.
- **Search**: **PostgreSQL** (SeaORM filters + ILIKE + GIN `tsvector`). Elasticsearch is
  a *planned* relevance/perf upgrade (T092) — **not** Meilisearch.
- **Cache/Queue/PubSub**: **Redis 7** (`redis` crate) — cache, rate-limiting, OTP TTL,
  JWT deny-list, WS pub/sub, and the apalis job backend.
- **Real-Time**: **Axum WebSocket** (Pusher-compatible) backed by Redis pub/sub — no
  separate Node/Echo server.
- **Auth**: **JWT** (`jsonwebtoken`, HS256), `bcrypt`, **TOTP** (`totp-rs`) for 2FA,
  **native RBAC** (custom Role/Permission table — no casbin).
- **Background Jobs**: **apalis** (Redis backend) for technical async work.
- **Automation**: **n8n** for *business* workflows (métier) — kept; apalis for
  *technical* jobs. (Constitution Principle IX, v3.1.0.)
- **Messaging**: **Evolution API** (WhatsApp, single service), Twilio (SMS).
- **Payments**: Orange Money API + MTN Mobile Money API (via `reqwest`).
- **PDF**: **headless-chrome** (Chromium) rendering an HTML/Askama template.
- **Object Storage**: **MinIO / S3** via `rust-s3`; `image` crate for WebP optimization.
- **Secrets**: **HashiCorp Vault** (AppRole + Transit) in prod; `IMMOG_*` env in dev.
- **Config**: `figment` (defaults → `config.toml` → `IMMOG_*` env).
- **Monitoring**: `tracing` + OpenTelemetry, Sentry (`sentry` crate), Prometheus
  (`metrics` + `metrics-exporter-prometheus`) + Grafana, OSSEC (HIDS).
- **Testing**: `cargo test` (unit) + **`axum-test`** + **`testcontainers`**
  (Postgres/Redis/MinIO).
- **DevOps**: Docker (multi-stage Rust build), Docker Compose / Swarm, Traefik, Nginx.

---

## 1. Architecture Overview: Decoupled API-First

### Decision: Rust/Axum (Backend API) + Next.js 14 (Frontend PWA)

**Rationale**:
- **Modern async core**: Axum on Tokio gives first-class async I/O, structured
  concurrency, and a Tower middleware ecosystem (timeouts, rate-limiting, tracing).
- **API-First**: mobile apps can consume the same REST/WS API later.
- **Independent scaling**: the stateless Rust API scales horizontally behind Traefik.
- **Developer experience**: `cargo` (build/test/fmt/clippy), a single static binary to
  deploy, and compile-time guarantees instead of runtime surprises.
- **Ecosystem**: crates.io covers everything needed (JWT, S3, image, Redis, Postgres,
  PDF, HTTP clients) with mature, audited crates.

**Architecture Diagram**:
```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  TRAEFIK (Reverse Proxy)                     │
│  - SSL Termination (Let's Encrypt)                          │
│  - Load Balancing                                            │
│  - Request Routing                                            │
└───────────────┬─────────────────────────┬───────────────────┘
                ↓                         ↓
    ┌───────────────────┐     ┌───────────────────┐
    │   NGINX (HTTPS)   │     │   NGINX (HTTPS)   │
    │  Next.js Frontend │     │   Rust API + WS   │
    │   (Port 3000)     │     │    (Port 8000)    │
    └─────────┬─────────┘     └─────────┬─────────┘
              ↓                         ↓
    ┌─────────────────────┐   ┌─────────────────────┐
    │   Next.js 14 Server │   │  Rust / Axum API    │
    │  - SSR Pages        │   │  - REST endpoints   │
    │  - PWA Service      │   │  - JWT auth + RBAC  │
    │  - pusher-js client │   │  - SeaORM (Postgres)│
    │  - React 18         │   │  - Axum WebSocket   │
    └─────────┬─────────┘     └─────────┬───────────┘
              │                         │
              │        ┌────────────────┼──────────┬──────────┬──────────┐
              │        ↓                ↓          ↓          ↓          ↓
              │  ┌──────────┐  ┌──────────┐  ┌──────┐  ┌────────┐  ┌────────┐
              │  │PostgreSQL│  │  Redis   │  │ n8n  │  │ apalis │  │ MinIO  │
              │  │  (Main)  │  │(cache/WS/│  │(métier│ │(workers│ │  (S3)  │
              │  │ +search  │  │ jobs/OTP)│  │ auto)│  │ techn.)│  │        │
              └──┴──────────┴──┴──────────┴──┴──────┴──┴────────┴──┴────────┘
```

**Communication Flow**:
1. User browser → Traefik → Nginx → Next.js SSR.
2. Next.js → API call → Traefik → Nginx → Rust API.
3. Rust API → PostgreSQL (via SeaORM).
4. Rust API → Redis (cache, rate-limit, OTP TTL, JWT deny-list, WS pub/sub).
5. Rust API → PostgreSQL search (ILIKE / `tsvector`).
6. Rust API → MinIO/S3 (photo/document uploads).
7. Rust API → enqueues **apalis** jobs (PDF generation, notifications, auto-expiry).
8. Rust API → triggers **n8n** webhooks for business automation workflows.

---

## 2. Backend: Rust (Axum + Tokio)

### Decision: Axum 0.8 on Tokio, Rust edition 2024 (rust-version 1.85+)

**Rationale**:
- **Performance & footprint**: a compiled async binary handles high concurrency with
  low, predictable memory — ideal for constrained/cheap infrastructure.
- **Correctness**: ownership + `Result`-based error handling remove null-deref and
  most runtime panics; enums model domain states exhaustively.
- **Composable middleware**: Tower layers for timeout, body-limit, CORS, tracing; our
  own Redis rate-limiter as a small explicit middleware.
- **Single artifact deploy**: one static binary (plus a migration binary) — no
  interpreter, no `vendor/`, trivial containers.

**Crate layout** (`rust-backend/`, crate `immog-backend`):
- **lib + two binaries**: `immog-backend` (API server) and `immog-migrate`
  (`up`/`down`/`status`/`fresh`), sharing `src/lib.rs`.
- `src/domain/<name>/` — `dto.rs`, `handlers.rs`, `routes` per bounded context
  (replaces Laravel Controllers + FormRequests + Resources).
- `src/services/` — explicit service structs holding deps (replaces Laravel
  container/facades).
- `src/db/{migration,entities}/` — SeaORM migrations (schema source of truth) + entities.
- `src/{auth,extractors,middleware}/` — JWT/RBAC/TOTP, `AuthUser`/`ValidatedJson`,
  rate-limiting.
- `src/{config,state,error,routes}.rs` — figment config, `AppState`, `AppError`, router.

**Key crates**:
```toml
# Cargo.toml (excerpt) — edition = "2024", rust-version = "1.85"
axum = { version = "0.8", features = ["macros", "ws", "multipart"] }
tokio = { version = "1", features = ["full"] }
tower = "0.5"
tower-http = { version = "0.6", features = ["cors", "trace", "timeout", "limit"] }
sea-orm = { version = "1.1", features = ["sqlx-postgres", "runtime-tokio-rustls", "macros", "with-uuid", "with-chrono", "with-json"] }
sea-orm-migration = "1.1"
jsonwebtoken = "9"
bcrypt = "0.15"
totp-rs = { version = "5", features = ["gen_secret", "otpauth"] }
redis = { version = "0.27", features = ["tokio-comp", "connection-manager"] }
s3 = { package = "rust-s3", version = "0.35", default-features = false, features = ["tokio-rustls-tls"] }
image = "0.25"
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls", "multipart"] }
figment = { version = "0.10", features = ["toml", "env"] }
serde = { version = "1", features = ["derive"] }
validator = { version = "0.18", features = ["derive"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
anyhow = "1"
thiserror = "1"

[dev-dependencies]
axum-test = "17"          # 17 targets axum 0.8 (16 targets 0.7)
testcontainers = "0.24"
testcontainers-modules = { version = "0.12", features = ["postgres", "redis", "minio"] }
```

---

## 3. Frontend: Next.js 14 + React 18

### Decision: Next.js 14 App Router with TypeScript (unchanged)

**Rationale**:
- **SSR + SSG**: pre-render public listing pages for SEO.
- **PWA**: `next-pwa` for offline capability on flaky mobile networks.
- **Image Optimization**: the `<Image>` component (backend already serves 3 WebP sizes).
- **TypeScript**: end-to-end type safety.

**API Communication**:
- **TanStack Query v5**: data fetching, caching, synchronization.
- **Axios / fetch**: HTTP client with an interceptor that attaches the **JWT Bearer**
  token (no Sanctum cookies / CSRF dance — the Rust API is stateless).

**Example API Call**:
```typescript
// lib/api/client.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // http://localhost:8000/api
})

// Attach the JWT access token (Bearer)
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default apiClient
```

```typescript
// hooks/useListings.ts
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/client'

export function useListings(filters: SearchFilters) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/listings/search', { params: filters })
      return data.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

---

## 4. Database: PostgreSQL 16 with SeaORM

### Decision: SeaORM 1.1 (async, on SQLx)

**Rationale**:
- **Async-native**: integrates cleanly with Tokio/Axum; connection pooling via SQLx.
- **Type-safe**: entities are structs with `DeriveEntityModel`; native PG enums map to
  Rust enums via `DeriveActiveEnum` — invalid states don't compile.
- **Migrations as code**: `sea-orm-migration` is the schema source of truth; the
  `immog-migrate` binary applies/rolls back.
- **Query builder**: composable, injection-safe filters (replaces Eloquent scopes).

**Migration Example** (`src/db/migration/m20250128_000003_create_listings.rs`):
```rust
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Native PG enums (type_operation, type_bien, quartier, statut_annonce) are
        // created in the enums migration. Tables use raw SQL for enum columns + GIN.
        manager.get_connection().execute_unprepared(r#"
            CREATE TABLE listings (
                id                 UUID PRIMARY KEY,
                createur_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type_operation     type_operation NOT NULL,
                type_bien          type_bien NOT NULL,
                titre              VARCHAR(100) NOT NULL,
                description        TEXT NOT NULL,
                prix_gnf           BIGINT NOT NULL,
                quartier           quartier NOT NULL,
                adresse_complete   VARCHAR(500),
                superficie_m2      INTEGER,
                nombre_chambres    INTEGER,
                nombre_salons      INTEGER,
                caution_mois       INTEGER,
                equipements        JSONB,
                photos             JSONB NOT NULL DEFAULT '[]',
                statut             statut_annonce NOT NULL DEFAULT 'DISPONIBLE',
                nombre_vues        INTEGER NOT NULL DEFAULT 0,
                options_premium    JSONB NOT NULL DEFAULT '{"badge_urgent":false,"remontee_48h":false,"photos_pro":false}',
                date_publication   TIMESTAMPTZ NOT NULL DEFAULT now(),
                date_derniere_maj  TIMESTAMPTZ,
                date_expiration    TIMESTAMPTZ NOT NULL
            );
            CREATE INDEX listings_quartier_statut_idx ON listings (quartier, statut);
            CREATE INDEX listings_type_statut_idx     ON listings (type_bien, statut);
            CREATE INDEX listings_prix_statut_idx      ON listings (prix_gnf, statut);
            CREATE INDEX listings_date_pub_idx         ON listings (date_publication);
            CREATE INDEX listings_fulltext_idx ON listings
                USING GIN (to_tsvector('french', titre || ' ' || description));
        "#).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection()
            .execute_unprepared("DROP TABLE IF EXISTS listings;").await?;
        Ok(())
    }
}
```

**Entity Example** (`src/db/entities/listing.rs`):
```rust
use sea_orm::entity::prelude::*;
use super::sea_orm_active_enums::{Quartier, StatutAnnonce, TypeBien, TypeOperation};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, serde::Serialize, serde::Deserialize)]
#[sea_orm(table_name = "listings")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub createur_id: Uuid,
    pub type_operation: TypeOperation,
    pub type_bien: TypeBien,
    pub titre: String,
    pub description: String,
    pub prix_gnf: i64,
    pub quartier: Quartier,
    pub statut: StatutAnnonce,
    pub nombre_vues: i32,
    pub photos: Json,
    pub date_publication: DateTimeWithTimeZone,
    pub date_expiration: DateTimeWithTimeZone,
    // ... remaining columns
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(belongs_to = "super::user::Entity",
        from = "Column::CreateurId", to = "super::user::Column::Id")]
    Createur,
}
impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef { Relation::Createur.def() }
}
impl ActiveModelBehavior for ActiveModel {}
```

> **Enum serde**: `DeriveActiveEnum` columns carry
> `#[serde(rename_all = "SCREAMING_SNAKE_CASE")]` so JSON matches the DB values
> (`KALOUM`, not `Kaloum`) — a real bug caught by an integration test during
> implementation.

**Query Examples** (the search endpoint, `src/domain/listings/query.rs`):
```rust
use sea_orm::{ColumnTrait, Condition, EntityTrait, QueryFilter, QueryOrder, PaginatorTrait};

let mut cond = Condition::all().add(listing::Column::Statut.eq(StatutAnnonce::Disponible));
if let Some(q) = &params.quartier   { cond = cond.add(listing::Column::Quartier.eq(q.clone())); }
if let Some(min) = params.prix_min  { cond = cond.add(listing::Column::PrixGnf.gte(min)); }
if let Some(max) = params.prix_max  { cond = cond.add(listing::Column::PrixGnf.lte(max)); }
if let Some(text) = &params.q {
    let like = format!("%{text}%");
    cond = cond.add(
        Condition::any()
            .add(listing::Column::Titre.like(&like))
            .add(listing::Column::Description.like(&like)),
    );
}

let paginator = listing::Entity::find()
    .filter(cond)
    .order_by_desc(listing::Column::DatePublication)
    .paginate(&db, per_page);
let total = paginator.num_items().await?;
let rows  = paginator.fetch_page(page - 1).await?;
```

---

## 5. Search: PostgreSQL (Elasticsearch planned)

### Decision: PostgreSQL search now; Elasticsearch as a future upgrade (T092)

**Rationale**:
- **One less moving part**: Postgres already stores the data. ILIKE on titre/description
  plus a **GIN `to_tsvector('french', …)`** index covers MVP relevance with no extra
  service to run, secure, and back up (**no Meilisearch**).
- **Filters + pagination**: quartier/type/prix/chambres filters and `LIMIT/OFFSET`
  pagination are expressed directly in SeaORM.
- **Good enough at MVP scale**: for the initial listing volume, Postgres meets the
  <500 ms search target (FR-094).

**When to add Elasticsearch (T092)** — a *planned* upgrade, not MVP:
- Typo-tolerance ("appartemen" → "appartement"), faceted counts, and relevance ranking
  beyond what `tsvector` offers, once volume/latency demands it.
- Integration would index changes via an apalis job (or Postgres logical replication →
  indexer), keeping Postgres the source of truth.

**Full-text query** (already available via the GIN index):
```rust
// Optional relevance mode using the GIN tsvector index (raw SQL through SeaORM):
let sql = r#"
    SELECT * FROM listings
    WHERE statut = 'DISPONIBLE'
      AND to_tsvector('french', titre || ' ' || description)
          @@ plainto_tsquery('french', $1)
    ORDER BY date_publication DESC
    LIMIT $2 OFFSET $3
"#;
let rows = listing::Entity::find()
    .from_raw_sql(Statement::from_sql_and_values(
        DbBackend::Postgres, sql, [term.into(), per_page.into(), offset.into()],
    ))
    .all(&db).await?;
```

---

## 6. Authentication: JWT + native RBAC + TOTP

### Decision: `jsonwebtoken` (HS256) + `bcrypt` + `totp-rs`, RBAC hand-rolled

**Rationale**:
- **Stateless & mobile-friendly**: JWT Bearer tokens work identically for the SPA and
  future mobile apps — no server-side session/cookie/CSRF machinery (replaces Sanctum).
- **Revocation without statefulness**: each token carries a `jti`; logout writes the
  `jti` to a **Redis deny-list** with a TTL == remaining token lifetime.
- **2FA**: `totp-rs` (feature `gen_secret` + `otpauth`) for optional TOTP, provisioning
  URIs for authenticator apps.
- **RBAC native, not casbin**: a small static `Role → Permission` table is simpler,
  faster, and fully type-checked; casbin's policy engine is overkill for 6 roles / 11
  permissions.

**Token model** (`src/auth/jwt.rs`):
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,          // user id
    pub role: String,       // RBAC role
    pub token_type: TokenType, // Access | Refresh
    pub iat: i64,
    pub exp: i64,
    pub jti: Uuid,          // for Redis deny-list revocation
}

pub fn issue_pair(secret: &[u8], user_id: Uuid, role: &str) -> AppResult<TokenPair> {
    let access  = encode_token(secret, user_id, role, TokenType::Access,  Duration::hours(24))?;
    let refresh = encode_token(secret, user_id, role, TokenType::Refresh, Duration::days(7))?;
    Ok(TokenPair { access, refresh })
}
```

**RBAC** (`src/auth/rbac.rs`): a static table maps each `Role` (Admin, Moderateur,
Agence, Particulier, Diaspora, Support) to its `Permission` set (ManageUsers,
ManageListings, ViewAnalytics, ManageCertifications, …). `Role::has(perm)` is a cheap
lookup; `AuthUser::require_permission(perm)` returns `403` otherwise.

**AuthUser extractor** (`src/extractors/auth_user.rs`): implements
`FromRequestParts` — parses `Authorization: Bearer`, verifies signature/expiry, checks
the Redis deny-list (`revoked:{jti}`), and yields `{ id, role, jti, exp }`.

**Routes** (`src/domain/auth`, mounted under `/api`):
```rust
Router::new()
    .route("/auth/register",    post(register))
    .route("/auth/login",       post(login))
    .route("/auth/verify-otp",  post(verify_otp))
    .route("/auth/refresh",     post(refresh))
    .route("/auth/me",          get(me).patch(update_me)) // AuthUser
    .route("/auth/logout",      post(logout))             // AuthUser → deny-list jti
```

**Register handler** (`src/domain/auth/handlers.rs`, sketch):
```rust
pub async fn register(
    State(state): State<SharedState>,
    ValidatedJson(req): ValidatedJson<RegisterRequest>,
) -> AppResult<Json<Envelope<UserPublic>>> {
    req.validate_password_strength()?;                 // FR-003
    if user::Entity::find().filter(user::Column::Telephone.eq(&req.telephone))
        .one(&state.db).await?.is_some() {
        return Err(AppError::Conflict("Téléphone déjà utilisé".into()));
    }
    let hash = bcrypt::hash(&req.mot_de_passe, bcrypt::DEFAULT_COST)?;
    let user = user::ActiveModel {
        id: Set(Uuid::new_v4()),
        telephone: Set(req.telephone.clone()),
        nom_complet: Set(req.nom_complet),
        mot_de_passe_hash: Set(hash),
        type_compte: Set(req.type_compte),
        badge_certification: Set(BadgeCertification::Bronze), // FR-002
        ..Default::default()
    }.insert(&state.db).await?;

    // OTP with anti-fraud (FR-029): Redis TTL + per-number throttle
    state.otp.issue(&user.telephone).await?;           // logs code in dev
    Ok(Json(Envelope::ok(UserPublic::from(user))))
}
```

Passwords use `bcrypt`; login verifies the hash and, on success, issues the JWT pair.
`POST /auth/logout` adds the current `jti` to the Redis deny-list. Secrets (the JWT
signing key) come from Vault in prod, `IMMOG_JWT_SECRET` in dev.

---

## 7. Real-Time: Axum WebSocket (Pusher-compatible)

### Decision: Axum WS endpoint backed by Redis pub/sub — no separate Echo server

**Rationale**:
- **One process**: the backend serves WebSocket upgrades at `/api/ws` itself
  (`axum` `ws` feature). No Node.js/Laravel-Echo broadcasting daemon to run or scale.
- **Fan-out across replicas**: events are published to Redis pub/sub; every API replica
  subscribes and pushes to its connected sockets — horizontal scaling just works.
- **Frontend unchanged**: the existing `laravel-echo` + `pusher-js` client keeps
  working; it simply points at the Axum WS endpoint (Pusher protocol-compatible).
- **Private channels**: the WS upgrade is authenticated with the JWT Bearer token; the
  server authorizes channel subscriptions (e.g. `conversation.{id}`) against membership.

**Backend (domain events → WS)** (`domain::messaging::events`, *planned* with US6):
```rust
// Publish to Redis; all replicas fan out to their sockets.
broadcast(&state, Event::NewMessage { conversation_id, message }).await?;
broadcast(&state, Event::TypingIndicator { conversation_id, user_id }).await?;
broadcast(&state, Event::MessageRead { message_id }).await?;
```

**WebSocket handler** (sketch):
```rust
async fn ws_handler(
    ws: WebSocketUpgrade,
    auth: AuthUser,                     // JWT-authenticated upgrade
    State(state): State<SharedState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| async move {
        // subscribe to Redis channels the user may access, forward messages to `socket`
        serve_socket(state, auth, socket).await;
    })
}
```

**Frontend client** (unchanged, targets Axum WS):
```typescript
// lib/socket/echo.ts
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
window.Pusher = Pusher

export const echo = new Echo({
  broadcaster: 'pusher',
  key: process.env.NEXT_PUBLIC_WS_APP_KEY,
  wsHost: process.env.NEXT_PUBLIC_WS_HOST, // Axum WS (pusher-compat)
  wsPort: Number(process.env.NEXT_PUBLIC_WS_PORT), // 8000
  forceTLS: false,
  auth: { headers: { Authorization: `Bearer ${getAccessToken()}` } },
})

echo.private(`conversation.${conversationId}`)
    .listen('NewMessage', (e) => { /* update UI */ })
```

---

## 8. Background Jobs: apalis (Redis backend)

### Decision: apalis for technical async work; n8n for business workflows

**Rationale**:
- **Async off the request path**: PDF generation, photo re-processing, email/SMS/push
  dispatch, and scheduled sweeps (listing auto-expiry, payment release) run on **apalis**
  workers so HTTP responses stay fast.
- **Redis backend**: same Redis instance as cache/pub-sub; reliable, retry-able,
  observable.
- **Clear split** (Constitution Principle IX, v3.1.0): **apalis = technique**
  (in-process, typed Rust jobs), **n8n = métier** (business-configurable workflows,
  e.g. multi-channel notification fan-out, external integrations).

**Job definition** (`src/jobs/generate_contract_pdf.rs`, *planned* — Contracts phase):
```rust
use apalis::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateContractPdf { pub contract_id: Uuid }

pub async fn generate_contract_pdf(
    job: GenerateContractPdf,
    state: Data<SharedState>,
) -> Result<(), JobError> {
    let contract = contract::Entity::find_by_id(job.contract_id)
        .one(&state.db).await?.ok_or(JobError::NotFound)?;

    // Render HTML (Askama template) → PDF via headless Chromium (see §9).
    let pdf = state.pdf.render_bail_location(&contract).await?;

    let key = format!("contracts/{}.pdf", contract.id);
    let url = state.storage.put(&key, &pdf, "application/pdf").await?;
    let hash = sha256_hex(&pdf);

    let mut am: contract::ActiveModel = contract.into();
    am.fichier_pdf_url = Set(Some(url));
    am.hash_sha256    = Set(Some(hash));
    am.update(&state.db).await?;

    // Hand off business notifications to n8n (webhook).
    state.n8n.trigger("contract-generated", &job.contract_id).await?;
    Ok(())
}
```

**Worker bootstrap**:
```rust
Monitor::new()
    .register({
        WorkerBuilder::new("pdf")
            .data(state.clone())
            .backend(RedisStorage::new(redis.clone()))
            .build_fn(generate_contract_pdf)
    })
    .run().await?;
```

**Enqueue from a handler**:
```rust
pub async fn generate(auth: AuthUser, State(state): State<SharedState>,
    ValidatedJson(req): ValidatedJson<GenerateContractRequest>)
    -> AppResult<Json<Envelope<ContractResponse>>> {
    let contract = /* insert BROUILLON contract */;
    state.jobs.pdf.push(GenerateContractPdf { contract_id: contract.id }).await?;
    Ok(Json(Envelope::ok(ContractResponse::from(contract)))) // 201, PDF async
}
```

**Scheduled jobs** (apalis cron): auto-expire `DISPONIBLE` listings past
`date_expiration` → `EXPIRE` (FR-014); payment-release timers (FR escrow).

---

## 9. PDF Generation: headless Chromium

### Decision: `headless_chrome` rendering an HTML/Askama template

**Rationale**:
- **Fidelity**: Chromium renders the exact HTML/CSS the contract template defines
  (page breaks, fonts, signature blocks) — far better layout control than a pure-Rust
  PDF drawer for legal documents.
- **Template reuse**: contracts are authored as an HTML template (**Askama**,
  compile-checked) rendered with the contract's data, then printed to PDF.
- **Deterministic hashing**: the generated bytes are SHA-256 hashed for integrity
  (stored on the contract) — supports Guinea's Loi 2016/037 e-signature requirements.

**HTML template** (`templates/contracts/bail_location.html`, Askama):
```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Contrat de Location - {{ contract.id }}</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 2cm; }
    .article { margin-bottom: 1.5cm; }
    .signature-block { margin-top: 3cm; page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RÉPUBLIQUE DE GUINÉE</h1>
    <p>Loi 2016/037 sur les signatures électroniques</p>
    <h2>CONTRAT DE LOCATION RÉSIDENTIEL</h2>
  </div>
  <div class="article">
    <h3>Article 1 - PARTIES</h3>
    <p><strong>Propriétaire:</strong> {{ landlord.nom_complet }}</p>
    <p><strong>Locataire:</strong> {{ tenant.nom_complet }}</p>
  </div>
  <div class="article">
    <h3>Article 3 - LOYER ET CAUTION</h3>
    <p>Loyer mensuel: {{ loyer_gnf }} GNF</p>
    <p>Caution ({{ caution_mois }} mois): {{ caution_gnf }} GNF</p>
  </div>
  <div class="signature-block">
    <p><em>Cachet électronique ImmoGuinée</em> — Hash SHA-256: {{ hash_prefix }}…</p>
  </div>
</body>
</html>
```

**Render to PDF** (`src/services/pdf.rs`, sketch):
```rust
use headless_chrome::{Browser, types::PrintToPdfOptions};

pub fn render_html_to_pdf(html: &str) -> anyhow::Result<Vec<u8>> {
    let browser = Browser::default()?;
    let tab = browser.new_tab()?;
    // Load the rendered HTML via a data URL, then print to PDF.
    tab.navigate_to(&format!("data:text/html;charset=utf-8,{}", urlencoding::encode(html)))?;
    tab.wait_until_navigated()?;
    let pdf = tab.print_to_pdf(Some(PrintToPdfOptions {
        print_background: Some(true),
        prefer_css_page_size: Some(true),
        ..Default::default()
    }))?;
    Ok(pdf)
}
```

> Chromium runs on the **apalis** worker (§8), never inline in a request. In containers,
> the worker image bundles a headless Chromium binary.

---

## 10. Notifications: native multi-channel notifier

### Decision: a `Notifier` service dispatching over typed channels (via apalis)

**Rationale**:
- **Per-user preferences** (FR-005, FR-062): each notification declares the channels it
  supports; the notifier intersects them with the user's `preferences_notification`.
- **Non-blocking**: notification sends are enqueued as apalis jobs.
- **Business fan-out via n8n**: complex multi-step notification workflows (e.g. escrow
  reminders across SMS + WhatsApp + email with retries) are configured in n8n; the Rust
  notifier handles direct, first-party sends.

**Channels**: SMS (Twilio), Email (Resend SMTP/API), **WhatsApp (Evolution API)**,
Push (Expo/FCM), in-app (persisted in a `notifications` table).

**Notification trait + payload**:
```rust
pub trait Notification {
    fn channels(&self, prefs: &NotificationPrefs) -> Vec<Channel>;
    fn sms(&self) -> Option<String> { None }
    fn email(&self) -> Option<EmailMessage> { None }
    fn whatsapp(&self) -> Option<String> { None }
    fn in_app(&self) -> serde_json::Value;
}

pub struct PaymentConfirmed { pub payment: payment::Model }

impl Notification for PaymentConfirmed {
    fn channels(&self, p: &NotificationPrefs) -> Vec<Channel> {
        let mut c = vec![Channel::InApp];
        if p.sms      { c.push(Channel::Sms); }
        if p.email    { c.push(Channel::Email); }
        if p.whatsapp { c.push(Channel::WhatsApp); }
        c
    }
    fn sms(&self) -> Option<String> {
        Some(format!("ImmoGuinée: Paiement confirmé ({} GNF). Quittance sur votre dashboard.",
            self.payment.montant_gnf))
    }
    fn whatsapp(&self) -> Option<String> {
        Some(format!("✅ Paiement confirmé: {} GNF", self.payment.montant_gnf))
    }
    fn in_app(&self) -> serde_json::Value {
        serde_json::json!({ "type": "payment_confirmed",
            "payment_id": self.payment.id, "montant_gnf": self.payment.montant_gnf })
    }
}
```

**Evolution API (WhatsApp) client** (`src/services/whatsapp.rs`, implemented):
```rust
pub struct WhatsAppClient { http: reqwest::Client, base_url: String, instance: String, api_key: String }

impl WhatsAppClient {
    pub async fn send_text(&self, to: &str, text: &str) -> AppResult<()> {
        if self.base_url.is_empty() { return Ok(()); } // disabled in dev
        let number = normalize_number(to);             // +224… → digits
        self.http
            .post(format!("{}/message/sendText/{}", self.base_url, self.instance))
            .header("apikey", &self.api_key)
            .json(&serde_json::json!({ "number": number, "text": text }))
            .send().await?.error_for_status()?;
        Ok(())
    }
}
```

**Dispatch**:
```rust
state.notifier.send(&user, PaymentConfirmed { payment }).await?; // enqueues per channel
```

---

## 11. Automation: n8n Workflows (business layer)

### Decision: n8n (self-hosted) triggered by Rust webhooks — business workflows only

**Rationale** (Constitution Principle IX, v3.1.0): keep **business-configurable**
automation (notification fan-out, external CRM/accounting sync, escrow reminders) in
n8n so non-developers can adjust it; keep **technical** async work in apalis (§8).

**Integration**:
1. The Rust API (or an apalis job) fires an event → calls an n8n webhook with a payload.
2. The n8n workflow runs (send notifications, update external systems, etc.).
3. n8n never writes core financial state directly; the **Rust job owns escrow release**
   and money movement — n8n handles notifications/side-effects only (finding D1).

**n8n workflow example** (Payment Confirmed — notifications):
```json
{
  "name": "Payment Confirmed Notifications",
  "nodes": [
    { "name": "Webhook", "type": "n8n-nodes-base.webhook",
      "parameters": { "path": "payment-confirmed", "httpMethod": "POST" } },
    { "name": "Notify Landlord (WhatsApp)", "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{$env.EVOLUTION_BASE_URL}}/message/sendText/{{$env.EVOLUTION_INSTANCE}}",
        "method": "POST",
        "headerParameters": { "parameters": [ { "name": "apikey", "value": "={{$env.EVOLUTION_API_KEY}}" } ] },
        "bodyParameters": { "parameters": [
          { "name": "number", "value": "={{$json.landlord.telephone}}" },
          { "name": "text", "value": "Caution reçue: {{$json.payment.montant_gnf}} GNF. Validez la réception sur ImmoGuinée." }
        ] }
      } }
  ]
}
```

**Rust webhook trigger** (`src/services/n8n.rs`, sketch):
```rust
pub async fn trigger(&self, workflow: &str, payload: &impl Serialize) -> AppResult<()> {
    self.http.post(format!("{}/webhook/{}", self.base_url, workflow))
        .json(payload).send().await?.error_for_status()?;
    Ok(())
}
```

---

## 12. AI/ML Integration

### Decision: Multi-tool approach, orchestrated from Rust via HTTP

**1. Ollama (local LLM for recommendations)** — recommend properties from a user's
search history.
```rust
// src/services/recommendation.rs
pub async fn recommend(&self, user_id: Uuid) -> AppResult<Vec<Uuid>> {
    let history = /* last 10 searches */;
    let prompt = build_prompt(&history);
    let resp: OllamaResponse = self.http
        .post("http://localhost:11434/api/generate")
        .json(&serde_json::json!({ "model": "llama3", "prompt": prompt, "stream": false }))
        .send().await?.json().await?;
    parse_listing_ids(&resp.response)
}
```

**2. Content moderation (Hugging Face model behind a Python microservice)** — auto-flag
inappropriate descriptions/messages. The Rust service calls it over HTTP; on high
confidence it rejects with `422`.
```rust
// src/services/moderation.rs
pub async fn moderate(&self, text: &str) -> AppResult<Moderation> {
    let m: Moderation = self.http.post("http://moderation:5000/moderate")
        .json(&serde_json::json!({ "text": text }))
        .send().await?.json().await?;
    Ok(m)
}
// in a handler:
let m = state.moderation.moderate(&req.description).await?;
if m.is_inappropriate && m.confidence > 0.9 {
    return Err(AppError::Validation("Contenu inapproprié. Veuillez reformuler.".into()));
}
```

**3. Fraud signals** — server-side heuristics (duplicate detection, price outliers,
velocity) computed in Rust and refined by a model service where useful. (Client-side
TensorFlow.js hints in the form are optional UX sugar, never the security boundary — the
authoritative check is server-side.)

> All ML runs as **external services** the Rust API calls over `reqwest`; no ML runtime
> is embedded in the API binary. Heavy/slow calls run on apalis workers, not inline.

---

## 13. Monitoring & Observability

### Structured logging & tracing (dev + prod)

`tracing` + `tracing-subscriber` (env-filter, JSON in prod), with `tower-http`'s
`TraceLayer` for per-request spans. Optionally exported via **OpenTelemetry** (OTLP) to
a collector.
```rust
tracing_subscriber::registry()
    .with(tracing_subscriber::EnvFilter::from_default_env())
    .with(tracing_subscriber::fmt::layer().json())
    .init();
```

### Error tracking (production): Sentry

```rust
let _guard = sentry::init((std::env::var("SENTRY_DSN").ok(), sentry::ClientOptions {
    release: sentry::release_name!(),
    traces_sample_rate: 0.1,
    ..Default::default()
}));
// tower-http + a sentry tower layer capture request context; AppError → Internal is reported.
```

### Metrics: Prometheus + Grafana

`metrics` facade + `metrics-exporter-prometheus` expose `/metrics`; a middleware records
counters/histograms.
```rust
metrics::counter!("immog_listings_created_total").increment(1);
metrics::histogram!("immog_api_response_seconds", "endpoint" => "/listings/search").record(elapsed);
metrics::gauge!("immog_active_users").set(active as f64);
```

### Frontend session replay & HIDS

- **Sentry (browser)** on the Next.js side for frontend errors; session replay via the
  chosen tool.
- **OSSEC (HIDS)** on the host: SSH brute-force, file integrity (`.env`, configs),
  web-attack signatures, rootkit detection.

> Laravel Telescope has no direct equivalent (it was a framework-coupled debug UI); its
> role is covered by `tracing` spans locally + Sentry/Prometheus in prod.

---

## 14. DevOps & Deployment

### Docker Compose (development / staging)

The Rust API and the apalis worker are built from one multi-stage image; backing
services run as containers. (Search is Postgres — **no Meilisearch**.)

```yaml
services:
  # Rust API (Axum) — single static binary
  backend:
    build: { context: ./rust-backend, dockerfile: Dockerfile }
    container_name: immog-backend
    environment:
      - IMMOG_DATABASE_URL=postgres://immog_user:immog@postgres:5432/immog_db
      - IMMOG_REDIS_URL=redis://:immog_redis_secret@redis:6379
      - IMMOG_S3_ENDPOINT=http://minio:9000
      - IMMOG_EVOLUTION_BASE_URL=http://evolution:8080
    depends_on: [postgres, redis, minio]
    networks: [immog-network]

  # apalis worker (jobs: PDF, notifications, scheduled sweeps)
  worker:
    build: { context: ./rust-backend, dockerfile: Dockerfile }
    command: ["immog-backend", "--role", "worker"]
    depends_on: [postgres, redis]
    networks: [immog-network]

  # Next.js Frontend
  frontend:
    build: { context: ./frontend, dockerfile: Dockerfile }
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api
      - NEXT_PUBLIC_WS_HOST=localhost
      - NEXT_PUBLIC_WS_PORT=8000
    depends_on: [backend]
    networks: [immog-network]

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: immog_db
      POSTGRES_USER: immog_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [postgres_data:/var/lib/postgresql/data]
    ports: ["5433:5432"]
    networks: [immog-network]

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes: [redis_data:/data]
    ports: ["6379:6379"]
    networks: [immog-network]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    ports: ["9000:9000", "9001:9001"]
    volumes: [minio_data:/data]
    networks: [immog-network]

  n8n:
    image: n8nio/n8n:latest
    ports: ["5678:5678"]
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
    volumes: [n8n_data:/home/node/.n8n]
    networks: [immog-network]

  # Evolution API (WhatsApp) — single service (no WAHA)
  evolution:
    image: atendai/evolution-api:latest
    ports: ["8080:8080"]
    environment:
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
    volumes: [evolution_data:/evolution/instances]
    networks: [immog-network]

  grafana:
    image: grafana/grafana:latest
    ports: ["3002:3000"]
    environment: [GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}]
    volumes: [grafana_data:/var/lib/grafana]
    networks: [immog-network]

  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks: [immog-network]

volumes:
  postgres_data:
  redis_data:
  minio_data:
  n8n_data:
  evolution_data:
  grafana_data:
  prometheus_data:

networks:
  immog-network: { driver: bridge }
```

### Rust Dockerfile (multi-stage, distroless runtime)

```dockerfile
# ---- builder ----
FROM rust:1.85-slim AS builder
WORKDIR /app
# Cache deps
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main(){}" > src/main.rs && cargo build --release || true
# Real build
COPY . .
RUN cargo build --release --bin immog-backend --bin immog-migrate

# ---- runtime ----
# The worker variant needs Chromium for headless PDF; the API variant does not.
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/immog-backend /usr/local/bin/immog-backend
COPY --from=builder /app/target/release/immog-migrate /usr/local/bin/immog-migrate
EXPOSE 8000
ENTRYPOINT ["immog-backend"]
```

> Secrets (DB/Redis passwords, JWT key, integration keys) are **not** baked into images
> or env in production — they are fetched from **HashiCorp Vault** (AppRole; `secret_id`
> from a Docker Secret) at boot, and sensitive fields are encrypted via **Vault Transit**
> (replacing Laravel's `EncryptionService`/`APP_KEY`). See `contracts/secrets.md`.

### Next.js Dockerfile

```dockerfile
FROM node:20-alpine AS base
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 15. Final Stack Summary

| Layer | Technology | Version | License | Notes |
|-------|-----------|---------|---------|-------|
| **Backend Framework** | Axum (on Tokio/Tower) | 0.8 | MIT | async, single binary |
| **Language (Backend)** | Rust | edition 2024 / 1.85+ | MIT/Apache-2.0 | ownership, exhaustive enums |
| **Frontend Framework** | Next.js | 14 | MIT | React 18, App Router |
| **Language (Frontend)** | TypeScript | 5+ | Apache 2.0 | strict mode |
| **Database** | PostgreSQL | 16 | PostgreSQL | ACID, JSONB, tsvector |
| **ORM** | SeaORM (on SQLx) | 1.1 | MIT/Apache-2.0 | typed entities + native enums |
| **Search** | PostgreSQL (ILIKE + GIN) | — | PostgreSQL | Elasticsearch planned (T092) |
| **Cache/Queue/PubSub** | Redis | 7 | BSD-3 | cache, rate-limit, WS, apalis |
| **Auth** | `jsonwebtoken` + `bcrypt` | 9 / 0.15 | MIT/Apache-2.0 | JWT HS256, Redis deny-list |
| **2FA** | `totp-rs` | 5 | MIT | TOTP, provisioning URI |
| **RBAC** | native (custom table) | — | — | 6 roles / 11 permissions |
| **Real-Time** | Axum WebSocket + Redis pub/sub | — | MIT | Pusher-compatible |
| **Background Jobs** | apalis (Redis) | latest | MIT | technical async work |
| **API Data Fetching** | TanStack Query | 5+ | MIT | server-state on frontend |
| **UI Library** | TailwindCSS | 3+ | MIT | utility-first CSS |
| **PWA** | next-pwa | 5+ | MIT | service worker, offline |
| **PDF Generation** | `headless_chrome` (Chromium) | latest | MIT | HTML/Askama → PDF |
| **Object Storage** | MinIO / S3 (`rust-s3`) | 0.35 | Apache-2.0 / MIT | listing photos, documents |
| **Image Processing** | `image` crate | 0.25 | MIT | WebP ×3 renditions |
| **HTTP Client** | `reqwest` (rustls) | 0.12 | MIT/Apache-2.0 | integrations |
| **Config** | `figment` | 0.10 | MIT/Apache-2.0 | env + TOML layering |
| **Secrets** | HashiCorp Vault (`vaultrs`) | latest | MPL-2.0 / Apache-2.0 | AppRole + Transit |
| **SMS** | Twilio | — | Proprietary | OTP, notifications |
| **Email** | Resend | — | Proprietary | transactional |
| **WhatsApp** | Evolution API | latest | Apache-2.0 | single service (no WAHA) |
| **Payments (Guinea)** | Orange Money + MTN MoMo | — | Proprietary | Mobile Money APIs |
| **Automation** | n8n | latest | Fair-code | business workflows |
| **AI (LLM)** | Ollama (Llama 3) | latest | MIT | recommendations |
| **AI (Moderation)** | Hugging Face (microservice) | latest | Apache 2.0 | content moderation |
| **Logging/Tracing** | `tracing` (+ OpenTelemetry) | 0.1 | MIT | structured spans |
| **Errors (Prod)** | Sentry (`sentry` crate) | latest | MIT / Proprietary svc | error tracking |
| **Metrics** | Prometheus + Grafana | latest | Apache 2.0 | `metrics` exporter |
| **HIDS** | OSSEC | latest | GPL v3 | intrusion detection |
| **Reverse Proxy** | Traefik | 2.11 | MIT | auto SSL (Let's Encrypt) |
| **Web Server** | Nginx | 1.25+ | BSD-2 | static, proxying |
| **Containerization** | Docker | 24+ | Apache 2.0 | multi-stage Rust build |
| **Testing (Backend)** | `cargo test` + `axum-test` + `testcontainers` | 17 / 0.24 | MIT/Apache-2.0 | unit + integration |
| **Testing (Frontend)** | Vitest + Playwright | latest | MIT | unit + E2E |
| **Load Testing** | k6 | latest | AGPL v3 | performance testing |

**Open Source Percentage**: ~85% (proprietary: Twilio, Resend, Sentry SaaS, Mobile
Money APIs).

---

## 16. Migration Path: Laravel → Rust

**Previous plan** (Laravel stack, superseded):
- Laravel 11 (PHP), Eloquent ORM, Laravel Sanctum auth.
- Meilisearch (Scout), Laravel Echo + Socket.IO, Laravel Queue/Horizon.
- Laravel PDF (DomPDF/Snappy), Laravel Notifications.

**Current plan** (Rust stack):
- Rust (Axum + Tokio), SeaORM, JWT + native RBAC + TOTP.
- PostgreSQL search (Elasticsearch planned), Axum WebSocket, apalis jobs.
- headless-chrome PDF, native multi-channel notifier + n8n for business workflows.

**Why the change?** The site is pre-production, so a clean full-Rust build is possible
with no migration risk. Drivers:
1. **Efficiency**: much lower memory/CPU per request → cheaper infra for the target market.
2. **Correctness**: compile-time guarantees (types, ownership, exhaustive enums) remove
   whole bug classes; typed query building removes injection footguns.
3. **Single-artifact ops**: one static binary + a migration binary; trivial containers,
   no interpreter/`vendor/`.
4. **Async-first**: Tokio/Axum for high-concurrency I/O; apalis for background work.
5. **Future mobile apps**: the stateless JWT REST/WS API serves web and mobile identically.

**Trade-offs**:
- ✅ **Pros**: performance, safety, low footprint, single binary, strong typing end-to-end.
- ❌ **Cons**: longer compile times, a smaller (but sufficient) hiring pool vs PHP,
  more explicit wiring than Laravel's conventions (mitigated by the `AppState` service
  container and `karpathy-guidelines` discipline: simplicity-first, surgical changes).

---

## 17. Development Workflow

**Backend (Rust)** — see `quickstart.md` for the full setup:
```bash
cd rust-backend
docker compose up -d postgres redis minio evolution   # backing services
cargo run --bin immog-migrate -- up                    # apply migrations
cargo run --bin immog-backend                          # serve API on :8000
# dev loop:
cargo watch -x 'run --bin immog-backend'
```

**Frontend (Next.js)**:
```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev   # http://localhost:3000
```

**Background worker (apalis)**:
```bash
cargo run --bin immog-backend -- --role worker   # PDF, notifications, scheduled jobs
```

**Run tests**:
```bash
# Backend: unit + integration (testcontainers spin up Postgres/Redis/MinIO)
cargo test
cargo test --lib                 # fast unit-only
cargo test --test listings_e2e   # a specific integration suite

# Frontend
pnpm test
```

**Quality gates**:
```bash
cargo fmt --all
cargo clippy --all-targets --all-features -- -D warnings
```

---

**Research Complete**: ✅ All technology decisions resolved for the Rust (Axum) + Next.js stack.

**Next Steps**:
1. `data-model.md` — SeaORM entities & migrations (done).
2. API contracts — Rust/Axum routes & handlers (`contracts/`, auth + listings done).
3. `quickstart.md` — cargo / SeaORM / testcontainers setup (done).
