# Developer Quickstart Guide: ImmoGuinée Platform (Rust / Axum)

**Feature**: ImmoGuinée - Plateforme Immobilière pour la Guinée
**Branch**: `001-immog-platform`
**Date**: 2025-01-28
**Estimated Setup Time**: 25-40 minutes (first `cargo build` dominates)

---

## Overview

This guide walks you through setting up the ImmoGuinée development environment using a
**Rust (Axum + Tokio, SeaORM)** backend + **Next.js 14** frontend. By the end, you'll
have a fully functional local instance with all backing services running.

**What You'll Build**:
- Rust API backend (`immog-backend`, Axum 0.8, edition 2024, Rust 1.85+)
- Next.js 14 frontend PWA (TypeScript)
- PostgreSQL 16 database (SeaORM migrations + native enums)
- Redis 7 (cache, rate-limiting, OTP TTL, JWT deny-list, WS pub/sub)
- MinIO (S3-compatible storage for listing photos, via `rust-s3`)
- Evolution API (WhatsApp) local instance
- Axum WebSocket (Pusher-compatible real-time — no separate Echo server)

> **Search**: full-text search runs on **PostgreSQL** (SeaORM filters + ILIKE, GIN
> index). Elasticsearch is a planned relevance/perf upgrade (T092) — it is **not**
> part of the dev stack. (There is no Meilisearch.)

> **Status**: **US1 (authentication + listings)** is implemented and covered by
> integration tests. Payments, contracts, messaging, certifications and admin are
> planned (see `contracts/`). Steps below reflect what runs today; planned services
> are marked *(planned)*.

---

## Prerequisites

### Required Software

1. **Rust 1.85+** (edition 2024) via [rustup](https://rustup.rs)
   ```bash
   rustup toolchain install stable
   rustc --version   # Should output 1.85.0 or higher
   ```

2. **Docker Desktop** (for the backing services: Postgres, Redis, MinIO, Evolution)
   ```bash
   docker --version  # 24.x.x or higher
   docker compose version
   ```
   Download: https://www.docker.com/products/docker-desktop

3. **Git**
   ```bash
   git --version
   ```

4. **Node.js 20 LTS** + **pnpm 8+** (for the Next.js frontend)
   ```bash
   node --version    # v20.x.x
   npm install -g pnpm
   pnpm --version    # 8.x.x or 9.x.x
   ```

### Recommended Tools

- **VS Code** with extensions:
  - **rust-analyzer** (essential)
  - **Even Better TOML**
  - ESLint, Prettier, Tailwind CSS IntelliSense (frontend)
- **cargo-watch** — auto-rebuild on save: `cargo install cargo-watch`
- **sea-orm-cli** (optional, entity generation): `cargo install sea-orm-cli`
- **Postman** / **Insomnia** (API testing)
- **TablePlus** / **DBeaver** (Database GUI)

---

## Step 1: Clone Repository

```bash
git clone https://github.com/your-org/immoguinee.git
cd immoguinee
git checkout 001-immog-platform
```

---

## Step 2: Start Backing Services (Docker)

The Rust app runs on the host with `cargo`; its dependencies (Postgres, Redis, MinIO,
Evolution API) run in Docker.

```bash
docker compose up -d postgres redis minio evolution
```

**Services Started** (default dev ports — match `Config::default()` in `src/config.rs`):

| Service | Port | URL | Credentials |
|---------|------|-----|-------------|
| PostgreSQL | 5433 | localhost:5433 | `immog_user` / `immog` (db `immog_db`) |
| Redis | 6379 | localhost:6379 | password `immog_redis_secret` |
| MinIO | 9000 / 9001 | http://localhost:9001 (console) | `minioadmin` / `minioadmin` |
| Evolution API | 8080 | http://localhost:8080 | API key from `.env` |

Verify all services are healthy:

```bash
docker compose ps
```

**Expected**: all four containers show `running` / `healthy`.

> The MinIO bucket (`immoguinee-images`) is **created automatically** by the backend at
> boot (`S3Storage::ensure_bucket`) — no manual bucket creation needed.

---

## Step 3: Backend Setup (Rust / Axum)

Navigate to the backend crate:

```bash
cd rust-backend
```

### 3.1 Configure Environment

Configuration is layered (highest priority last): `Config::default()` →
`config.toml` → `IMMOG_*` env vars (nested keys split on `__`). The defaults already
point at the Docker services above, so **for a standard local run you can skip
config.toml entirely.**

To override, either create `rust-backend/config.toml`:

```toml
host = "0.0.0.0"
port = 8000
database_url = "postgres://immog_user:immog@localhost:5433/immog_db"
redis_url    = "redis://:immog_redis_secret@localhost:6379"
s3_endpoint  = "http://localhost:9000"
s3_bucket    = "immoguinee-images"
evolution_base_url = "http://localhost:8080"
evolution_instance = "immoguinee"
cors_allowed_origin = "http://localhost:3000"
```

…or export env vars (they win over the file):

```bash
export IMMOG_PORT=8000
export IMMOG_DATABASE_URL="postgres://immog_user:immog@localhost:5433/immog_db"
export IMMOG_JWT_SECRET="a-long-random-dev-secret"   # dev only; prod fetches from Vault
```

> **Secrets**: in production the JWT secret, DB/Redis passwords and all integration
> keys are fetched from **HashiCorp Vault** at boot (`secret/immoguinee/app`). In dev,
> `IMMOG_JWT_SECRET` provides a fallback (a dev constant is used if unset). Never commit
> real secrets. See `contracts/secrets.md`.

**Access keys for MinIO/S3** are read by `rust-s3` from the standard env vars:

```bash
export AWS_ACCESS_KEY_ID=minioadmin
export AWS_SECRET_ACCESS_KEY=minioadmin
```

---

### 3.2 Run Database Migrations

Migrations are SeaORM code (`src/db/migration/`) — the schema source of truth. Apply
them with the `immog-migrate` binary:

```bash
cargo run --bin immog-migrate -- up
```

This will:
1. Create all PostgreSQL native enums (24 enums, e.g. `quartier`, `statut_annonce`, `statut_visite`).
2. Create the tables (users, listings, contracts, payments, visits, …).
3. Create indexes (incl. the GIN index used by search).

**Expected output**:
```
Applying migration 'm20250128_000001_create_enums'
Migration 'm20250128_000001_create_enums' has been applied
Applying migration 'm20250128_000002_create_users'
...
```

Other migration subcommands:
```bash
cargo run --bin immog-migrate -- status     # show applied / pending
cargo run --bin immog-migrate -- down       # roll back the last migration
cargo run --bin immog-migrate -- fresh      # DROP everything + re-apply (dev only!)
```

> Seeding: a `db:seed` equivalent is *(planned)*. For now, create data through the API
> (Step 5) — register a user, then create listings.

---

### 3.3 Run the API Server

```bash
cargo run --bin immog-backend
```

The first build compiles all dependencies (~several minutes); subsequent runs are fast.
For an auto-reloading dev loop:

```bash
cargo watch -x 'run --bin immog-backend'
```

**Expected output**:
```
INFO immog_backend: connected to Postgres
INFO immog_backend: connected to Redis
INFO immog_backend: S3 bucket 'immoguinee-images' ready
INFO immog_backend: listening on 0.0.0.0:8000
```

All routes are mounted under `/api`.

---

## Step 4: Frontend Setup (Next.js 14)

Open a **new terminal** and navigate to the frontend:

```bash
cd ../frontend
```

### 4.1 Install Dependencies

```bash
pnpm install
```

This installs Next.js 14, React 18, TailwindCSS 3, TanStack Query v5, the
`laravel-echo` + `pusher-js` client (now pointed at the Axum WS endpoint), shadcn/ui,
and related packages (~100 total). **Estimated time**: 2-4 minutes.

### 4.2 Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# API URL (Rust backend, routes under /api)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Real-time — Axum WebSocket (Pusher-compatible), served by the backend itself
NEXT_PUBLIC_WS_HOST=localhost
NEXT_PUBLIC_WS_PORT=8000
NEXT_PUBLIC_WS_APP_KEY=immoguinee-key

# App
NEXT_PUBLIC_APP_NAME=ImmoGuinée
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4.3 Start the Development Server

```bash
pnpm dev
```

**Output**:
```
▲ Next.js 14.2.0
- Local:   http://localhost:3000
✓ Ready in 2.8s
```

Open http://localhost:3000 — the homepage should load listings from the Rust API.

---

## Step 5: Additional Services

### 5.1 Evolution API (WhatsApp)

Started in Step 2. To connect a WhatsApp number:

1. Open the Evolution API dashboard: http://localhost:8080
2. Create/connect the instance named `immoguinee` and scan the QR code.
3. Ensure `IMMOG_EVOLUTION_BASE_URL` / `IMMOG_EVOLUTION_INSTANCE` match your config
   (defaults: `http://localhost:8080` / `immoguinee`).

The backend sends via `services::whatsapp::WhatsAppClient` (Evolution `sendText`). If
`evolution_base_url` is empty, WhatsApp sending is disabled (no-op) — fine for most
local work.

### 5.2 Real-Time (Axum WebSocket) — *(planned wiring)*

Broadcasting is served by the backend itself at `/api/ws` (Pusher-compatible), backed
by Redis pub/sub. **There is no separate Laravel Echo / Node broadcasting process to
run.** The frontend connects with its existing `laravel-echo` + `pusher-js` client
pointed at `NEXT_PUBLIC_WS_HOST:NEXT_PUBLIC_WS_PORT`.

### 5.3 Background Jobs (apalis) — *(planned)*

Scheduled/async work (photo optimization off-thread, listing auto-expiry, payment
release, notifications) will run on **apalis** workers backed by Redis. Today, photo
optimization runs inline in the upload handler. No separate worker process is required
yet.

---

## Step 6: Verify Setup (Smoke Tests)

### Test 1: API Health Check

```bash
curl http://localhost:8000/api/health
```

**Expected**:
```json
{"success":true,"status":"healthy"}
```

---

### Test 2: User Registration

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "telephone": "+224622999999",
    "nom_complet": "Test User",
    "mot_de_passe": "Test123!",
    "type_compte": "PARTICULIER"
  }'
```

**Expected**: `{"success": true, ...}` and an OTP issued (logged by the backend in dev).

Then verify the OTP and log in:

```bash
# (use the OTP printed in the backend logs)
curl -X POST http://localhost:8000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"telephone":"+224622999999","code":"123456"}'

curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"telephone":"+224622999999","mot_de_passe":"Test123!"}'
```

Login returns `access_token` (24h) + `refresh_token` (7d). Use the access token as
`Authorization: Bearer <token>` on authenticated endpoints.

---

### Test 3: Create & Search a Listing

```bash
TOKEN="<access_token from login>"

# Create (owner)
curl -X POST http://localhost:8000/api/listings \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type_operation":"LOCATION","type_bien":"APPARTEMENT",
       "titre":"Bel appartement 2 chambres vue mer",
       "description":"Magnifique appartement situé à Kaloum, proche commodités.",
       "prix_gnf":2500000,"quartier":"KALOUM","caution_mois":3}'

# Public search (Postgres)
curl "http://localhost:8000/api/listings/search?quartier=KALOUM&type_bien=APPARTEMENT"
```

**Expected**: the created listing appears in the search results (`statut=DISPONIBLE`).

---

### Test 4: Next.js Frontend

1. Open http://localhost:3000
2. Click "Rechercher" (Search)
3. Apply filters (Kaloum, Appartement)
4. Verify listings display

---

## Step 7: Run Tests

### Backend Tests (cargo)

Unit tests run without Docker; integration tests spin up **Postgres + Redis + MinIO via
testcontainers** (Docker must be running — no manual services needed for them).

```bash
cargo test                       # unit + integration (testcontainers)
cargo test --lib                 # unit tests only (fast, no Docker)
cargo test --test listings_e2e   # a specific integration suite
```

**Expected output**:
```
running 23 tests
test auth::jwt::tests::issue_and_verify_roundtrip ... ok
test auth::rbac::tests::admin_has_manage_users ... ok
...
test result: ok. 23 passed; 0 failed

running 3 tests   (tests/listings_e2e.rs, testcontainers)
test register_login_create_search_show_flow ... ok
test upload_photo_stores_in_minio ... ok
test me_and_logout_revoke_token ... ok
test result: ok. 3 passed; 0 failed
```

### Frontend Tests (Vitest / Playwright)

```bash
pnpm test:unit    # Vitest unit tests
pnpm test:e2e     # Playwright E2E (US1-US4)
```

---

## Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/add-rating-system
```

### 2. Make Backend Changes (Rust)

Edit files under `rust-backend/src/`. Typical additions:

```bash
# New table → add a migration module under src/db/migration/, register it in the Migrator
# (optionally) regenerate an entity:
sea-orm-cli generate entity -u "$IMMOG_DATABASE_URL" -o src/db/entities --with-serde both

# Apply it
cargo run --bin immog-migrate -- up
```

A new domain lives under `src/domain/<name>/` (`dto.rs`, `handlers.rs`, `routes`),
mounted in `src/routes/mod.rs`. Services go under `src/services/`.

### 3. Make Frontend Changes (Next.js)
Edit files in `frontend/app/`, `frontend/components/`, etc.

### 4. Lint / Format / Type-check

**Backend (Rust)**:
```bash
cargo fmt --all          # format
cargo clippy --all-targets --all-features -- -D warnings   # lint (denies warnings)
cargo check              # fast type-check
```

**Frontend (Next.js)**:
```bash
pnpm typecheck
pnpm lint
pnpm format
```

### 5. Run Tests
```bash
cargo test
pnpm test
```

### 6. Commit, Push, PR
```bash
git add .
git commit -m "feat: add rating system for transactions"
git push origin feature/add-rating-system
```
Then open a Pull Request on GitHub.

---

## Troubleshooting

### Docker services won't start
```bash
docker compose down          # (add -v ONLY if you intend to wipe data volumes)
docker compose up -d --force-recreate postgres redis minio evolution
```

### Migration errors / dirty schema (dev)
```bash
cargo run --bin immog-migrate -- fresh    # DROP all + re-apply (DEV ONLY — destroys data)
```

### Port 8000 already in use
```bash
# find and stop the process, or run on another port:
IMMOG_PORT=8001 cargo run --bin immog-backend
```

### PostgreSQL connection refused
```bash
docker compose ps postgres
docker compose logs postgres
docker compose restart postgres
# Confirm IMMOG_DATABASE_URL host/port match (default localhost:5433).
```

### Photos not uploading to MinIO
1. Verify MinIO is running: http://localhost:9001 (`minioadmin` / `minioadmin`).
2. Confirm `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` are exported.
3. The bucket `immoguinee-images` is auto-created at boot — check the backend logs for
   `S3 bucket ... ready`; if missing, check `s3_endpoint`.

### OTP not received
In dev the OTP is **logged by the backend** (no SMS provider needed). Check the
`cargo run` console output for the generated code.

### Slow / stuck `cargo build`
The first build is heavy. If a build hangs on a target lock, ensure no other `cargo`
process is running against the same target dir, then retry. `cargo build` once, then use
`cargo watch` for the dev loop.

---

## Project Structure Reference

```
immoguinee/
├── rust-backend/                 # Rust API (crate: immog-backend)
│   ├── Cargo.toml                # edition 2024, rust-version 1.85
│   ├── config.toml               # optional local overrides (git-ignored)
│   └── src/
│       ├── lib.rs                # module tree shared by both bins
│       ├── main.rs               # bin: immog-backend (API server)
│       ├── bin/immog_migrate.rs  # bin: immog-migrate (up/down/status/fresh)
│       ├── config.rs             # figment config (IMMOG_* env)
│       ├── state.rs              # AppState (db, redis, storage, whatsapp, jwt)
│       ├── error.rs              # AppError → JSON envelope
│       ├── routes/               # router assembly (nest under /api, CORS)
│       ├── auth/                 # jwt, rbac, totp
│       ├── extractors/           # AuthUser, ValidatedJson
│       ├── middleware/           # rate_limit (native Redis)
│       ├── services/             # storage (S3), listing_photo (WebP), otp, whatsapp
│       ├── domain/               # auth/, listings/  (dto + handlers + routes)
│       └── db/
│           ├── migration/        # SeaORM migrations (schema source of truth)
│           └── entities/         # SeaORM entities + native enums
│   └── tests/                    # integration suites (testcontainers)
├── frontend/                     # Next.js 14 PWA
│   ├── app/  components/  lib/ (api.ts, socket/echo.ts)
│   └── .env.example
├── docker-compose*.yml           # backing services (dev) + prod/swarm
└── specs/001-immog-platform/     # spec, plan, tasks, data-model, contracts, ...
```

---

## Useful Commands

### Backend (Rust)
```bash
# Run / dev loop
cargo run --bin immog-backend           # start the API on :8000
cargo watch -x 'run --bin immog-backend'

# Migrations
cargo run --bin immog-migrate -- up
cargo run --bin immog-migrate -- status
cargo run --bin immog-migrate -- down
cargo run --bin immog-migrate -- fresh  # dev only

# Quality
cargo fmt --all
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo test --lib
```

### Frontend (Next.js)
```bash
pnpm dev            # dev server
pnpm build          # production build
pnpm test:unit      # Vitest
pnpm test:e2e       # Playwright
pnpm lint / pnpm format / pnpm typecheck
```

### Docker (backing services)
```bash
docker compose up -d postgres redis minio evolution
docker compose ps
docker compose logs -f postgres
docker compose down            # stop (keep volumes); add -v to wipe data
```

---

## Next Steps

1. **Explore the code**: start with `rust-backend/src/domain/` and `frontend/app/page.tsx`.
2. **Read API contracts**: `specs/001-immog-platform/contracts/`.
3. **Implement a user story**: pick from US1-US10 in `spec.md` (US1 auth+listings is done).
4. **Run integration tests**: `cargo test --test listings_e2e` (testcontainers).

---

## Additional Resources

- **Specification**: `specs/001-immog-platform/spec.md`
- **Architecture / decisions**: `specs/001-immog-platform/research.md`
- **Data Model**: `specs/001-immog-platform/data-model.md`
- **API Contracts**: `specs/001-immog-platform/contracts/`
- **Constitution**: `.specify/memory/constitution.md`

---

## Getting Help

- **GitHub Issues**: https://github.com/your-org/immoguinee/issues
- **Axum Docs**: https://docs.rs/axum
- **SeaORM Docs**: https://www.sea-ql.org/SeaORM/
- **Next.js Docs**: https://nextjs.org/docs

---

**Setup Complete!** 🎉

You now have a fully functional ImmoGuinée development environment with a Rust (Axum)
backend + Next.js 14 frontend. Happy coding!

**Estimated Total Setup Time**: 25-40 minutes (dominated by the first `cargo build`)
**Next**: Start with User Story 1 (Publish Listing in < 5 minutes) — already implemented.
