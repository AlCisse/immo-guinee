# Tasks: ImmoGuinée Platform

**Input**: Design documents from `/specs/001-immog-platform/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Architecture**: Rust/Axum Backend + Next.js 16 Frontend (Decoupled API-First) — backend **écrit en Rust** (remplace un prototype Laravel jamais déployé)
**Target**: 10 User Stories (US1-US10), 101 Functional Requirements, 20 Success Criteria
**Tech Stack**: Rust 1.85+ (Axum + Tokio, édition 2024), SeaORM/SQLx, oxide-auth + JWT, apalis, Elasticsearch, PostgreSQL+PostGIS, Redis 7+, Varnish, Vault, React Leaflet

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Statut du backend

Le backend est **écrit en Rust (Axum)** — voir `rust-backend/README.md` et `plan.md`. Un prototype
Laravel définissait les mêmes fonctionnalités mais **n'a jamais été déployé** ; il est remplacé
directement (pas de cohabitation, pas de migration de données). Convention des cases à cocher :

- `[ ]` = tâche backend Rust **à réaliser** (le backend Rust est un scaffold ; rien n'est encore implémenté).
- `[x]` = artefact **déjà en place** et réutilisé tel quel (frontend Next.js, workflows n8n,
  dashboards de monitoring, config Traefik) — indépendant du backend.

Le dossier `backend/` (prototype Laravel) est **archivé/supprimé** au profit de `rust-backend/`.

## Path Conventions

- **Backend (Rust)**: `rust-backend/` (crate `immog-backend`, Axum + Tokio, édition 2024)
- **Frontend**: `frontend/` (Next.js 16 PWA - TypeScript 5+)
- **Infrastructure**: `docker/`, `n8n/`, `monitoring/`

**Note**: This tasks.md reflects the **Rust/Axum + Next.js 16** stack with:
- **oxide-auth + jsonwebtoken** (OAuth2 server + JWT, secret signé chargé depuis Vault — remplace Passport)
- **SeaORM / SQLx** (ORM + requêtes vérifiées à la compilation — remplace Eloquent)
- **Elasticsearch** (advanced search via client `elasticsearch` — remplace Laravel Scout)
- **PostgreSQL + PostGIS** (geospatial support)
- **Redis 7+** (cache, sessions, queues, broadcasting) via `redis` / `deadpool-redis`
- **Varnish** (HTTP cache layer)
- **RBAC natif** (role-based access control — remplace Spatie Permission)
- **image / imageproc** (photo optimization — remplace Laravel Image + Imageoptim)
- **Geocoding via reqwest** (Nominatim) + PostGIS
- **React Leaflet** (interactive maps)
- **Vault** (secrets KV + Transit — remplace Docker Secrets)
- **Docker Swarm + CapRover** (deployment options)

**Monitoring:**
- tracing + tracing-subscriber (JSON)
- Prometheus
- Grafana
- Sentry
- Logrocket
- OSSEC
**Backend & API (crates):**
- axum, axum-extra, tower, tower-http
- headless-chrome (PDF — remplace Laravel PDF/DomPDF)
- apalis + tokio-cron-scheduler (jobs/queue — remplace Laravel Queue/Horizon)
- notifications custom (Notifiable + channels — remplace Laravel Notifications)
- RBAC natif (RBAC — remplace Spatie Permission)
- elasticsearch (remplace Scout)
- validator (FormRequests — remplace user-verification/validation)
- totp-rs (2FA — remplace two-factor-auth)
- tower-governor / Tower layer (brute-force / rate limit)
- redis / deadpool-redis (cache)
**Frontend & PWA:**
- Next.js
- TypeScript
- Tailwind CSS
- PWA Plugin
- React Query
- Framer Motion
**Automatisation:**
- n8n

**Messagerie:**
- Socket.IO
- Axum WebSocket (pusher-compat — remplace Laravel Echo/Reverb côté backend)
---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Rust backend crate at rust-backend/ (Cargo.toml, `immog-backend` + `immog-migrate` bins, Axum boot) — scaffold en place
- [x] T002 [P] Initialize Next.js 16 project structure at frontend/ with TypeScript, TailwindCSS, PWA plugin, React Leaflet
- [ ] T003 [P] Configure Docker Compose multi-service stack in docker/docker-compose.yml (PostgreSQL+PostGIS, Redis, Elasticsearch, Varnish, MinIO, Vault, n8n, Evolution API) — ajouter service `rust-backend` (+ worker apalis, scheduler)
- [ ] T004 [P] Setup environment configuration files: rust-backend/.env.example + config.toml, frontend/.env.example with all required variables (prod = Vault)
- [x] T005 [P] Configure ESLint + Prettier for frontend in frontend/.eslintrc.json and frontend/.prettierrc
- [ ] T006 [P] Configure rustfmt + clippy for backend in rust-backend/rustfmt.toml + `#![deny(warnings)]` CI (remplace PHP CS Fixer)
- [x] T007 Setup Traefik reverse proxy in docker/traefik/ with auto-SSL configuration (routing frontend + rust-backend)
- [ ] T008 [P] Create GitHub Actions workflows in .github/workflows/rust-backend-ci.yml (cargo fmt + clippy + test + audit)
- [x] T009 [P] Setup monitoring stack: monitoring/grafana/, monitoring/prometheus/ with initial dashboards

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & ORM (SeaORM + migrations)

- [x] T010 Create PostgreSQL enums migration in rust-backend/src/db/migration/m20250128_000001_create_enums.rs (12 enums: badge, type_compte, statut_verification, etc.)
- [ ] T011 Enable PostGIS extension in rust-backend/src/db/migration/m20250128_000002_enable_postgis.rs for geospatial support
- [x] T012 Create users table migration in rust-backend/src/db/migration/m20250128_000003_create_users.rs with UUID primary key
- [x] T013 Create listings table migration in rust-backend/src/db/migration/m20250128_000004_create_listings.rs with indexes and PostGIS geometry columns
- [x] T014 Create contracts table migration in rust-backend/src/db/migration/m20250128_000005_create_contracts.rs
- [x] T015 Create payments table migration in rust-backend/src/db/migration/m20250128_000006_create_payments.rs
- [x] T016 [P] Create certification_documents table migration in rust-backend/src/db/migration/m20250128_000007_create_certification_documents.rs
- [x] T017 [P] Create conversations table migration in rust-backend/src/db/migration/m20250128_000008_create_conversations.rs
- [x] T018 [P] Create messages table migration in rust-backend/src/db/migration/m20250128_000009_create_messages.rs
- [x] T019 [P] Create disputes table migration in rust-backend/src/db/migration/m20250128_000010_create_disputes.rs
- [x] T020 [P] Create transactions table migration in rust-backend/src/db/migration/m20250128_000011_create_transactions.rs
- [x] T021 [P] Create ratings table migration in rust-backend/src/db/migration/m20250128_000012_create_ratings.rs
- [x] T022 [P] Create insurances table migration in rust-backend/src/db/migration/m20250128_000013_create_insurances.rs (Phase 2 only)
- [x] T022a [P] Create visits table migration in rust-backend/src/db/migration/m20250128_000015_create_visits.rs (+ enum statut_visite, FR-099/100/101)

> **Note** : ces migrations `sea-orm-migration` sont l'**unique source de vérité** du schéma PostgreSQL.
> Les entités SeaORM peuvent être écrites à la main ou **générées** depuis la base après application des
> migrations (`sea-orm-cli generate entity`).

### SeaORM Entities

- [x] T023 Create User SeaORM entity in rust-backend/src/db/entities/user.rs with UUID, relations, scopes (auth JWT + RBAC RBAC natif — remplace HasApiTokens/HasRoles/HasUuids) (FR-002 badge Bronze par défaut)
- [x] T024 [P] Create Listing SeaORM entity in rust-backend/src/db/entities/listing.rs with Elasticsearch indexing hook (remplace Searchable/Scout)
- [x] T025 [P] Create Contract SeaORM entity in rust-backend/src/db/entities/contract.rs with JSON columns (serde_json)
- [x] T026 [P] Create Payment SeaORM entity in rust-backend/src/db/entities/payment.rs with typed getters (remplace accessors/mutators)
- [x] T027 [P] Create CertificationDocument entity in rust-backend/src/db/entities/certification_document.rs
- [x] T028 [P] Create Conversation entity in rust-backend/src/db/entities/conversation.rs
- [x] T029 [P] Create Message entity in rust-backend/src/db/entities/message.rs with broadcast emit on insert
- [x] T030 [P] Create Dispute entity in rust-backend/src/db/entities/dispute.rs
- [x] T031 [P] Create Transaction entity in rust-backend/src/db/entities/transaction.rs
- [x] T032 [P] Create Rating entity in rust-backend/src/db/entities/rating.rs
- [x] T033 [P] Create Insurance entity in rust-backend/src/db/entities/insurance.rs
- [x] T033a [P] Create Visit SeaORM entity in rust-backend/src/db/entities/visit.rs (enum StatutVisite, relations Listing/User)

### Authentication & Authorization

- [ ] T034 Install and configure oxide-auth (OAuth2 server) in rust-backend/src/auth/oauth2.rs with personal access tokens (remplace Laravel Passport)
- [x] T035 Configure JWT signing/verification in rust-backend/src/auth/jwt.rs — secret de signature chargé depuis Vault
- [x] T036 Create authentication extractor in rust-backend/src/extractors/auth_user.rs (remplace middleware Authenticate)
- [x] T037 [P] Implement native RBAC in rust-backend/src/auth/rbac.rs — fixed Role (6) + Permission (11) with a static role→permissions table (remplace Spatie Permission ; pas de dépendance)
- [x] T038 [P] Add role-based guards on AuthUser in rust-backend/src/extractors/auth_user.rs (require_role / require_permission → 403 Forbidden) (remplace CheckAdmin)
- [x] T039 [P] Create OTP service in rust-backend/src/services/otp.rs with Redis storage and Twilio SMS integration (reqwest) (FR-029 anti-fraude : max 3 essais, blocage 5 min, renvoi bloqué 60s, expiration 5 min, journalisation)
- [x] T040 [P] Configure TOTP 2FA in rust-backend/src/auth/totp.rs with totp-rs (RFC 6238 — secrets existants restent valides)
- [x] T041 [P] Create native Redis rate limiter in rust-backend/src/middleware/rate_limit.rs (fixed window ; presets FR-087 public/user/payment + login brute-force → 429 Retry-After)
- [x] T042 Configure CORS in rust-backend/src/routes/mod.rs::build_cors (tower-http CorsLayer, origin from config, methods + headers) for frontend domain

### Backend Services & Domain

- [ ] T043 Create user domain/repository in rust-backend/src/domain/user.rs (accès données via SeaORM)
- [ ] T044 [P] Create listing domain/repository in rust-backend/src/domain/listing.rs
- [ ] T045 [P] Create contract domain/repository in rust-backend/src/domain/contract.rs
- [ ] T046 [P] Create payment domain/repository in rust-backend/src/domain/payment.rs (transactions atomiques SeaORM pour escrow)
- [ ] T047 [P] Create message domain/repository in rust-backend/src/domain/message.rs

### External Integrations

- [ ] T048 Create Twilio SMS client in rust-backend/src/services/sms.rs (reqwest) (FR-061 Canal 3)
- [x] T049 [P] Create WhatsApp client (Evolution API v2, sendText + apikey) in rust-backend/src/services/whatsapp.rs (reqwest) — send_text + number normalization (FR-061 Canal 2). NB: envoi réel = session WhatsApp connectée (staging) ; wiring OTP/notifications = W2.
- [ ] T050 [P] Create email channel (lettre SMTP) in rust-backend/src/notifications/channels/email.rs
- [ ] T051 Create Orange Money API client in rust-backend/src/services/orange_money.rs (reqwest) (FR-039)
- [ ] T052 [P] Create MTN Mobile Money API client in rust-backend/src/services/mtn_momo.rs (reqwest) (FR-039)
- [x] T053 Create MinIO/S3 storage client in rust-backend/src/services/storage.rs (rust-s3)
- [ ] T054 Create Elasticsearch client in rust-backend/src/services/search.rs (crate `elasticsearch`)
- [x] T055 [P] Create photo optimization service in rust-backend/src/services/listing_photo.rs (image, WebP lossless, 3 tailles thumbnail/medium/large) (remplace Laravel Image/Imageoptim ; imageproc/watermarks différé)
- [ ] T056 [P] Create geocoding service in rust-backend/src/services/geocoding.rs (reqwest → Nominatim) + PostGIS
- [x] T057 [P] Configure Varnish HTTP cache in docker/varnish/default.vcl for static asset caching
- [ ] T057a [P] Configure Redis cache pool in rust-backend/src/state.rs (deadpool-redis) (FR-095)
- [ ] T057b [P] Configure Redis-backed sessions in rust-backend/src/auth/sessions.rs (tower-sessions)
- [ ] T057c [P] Configure Redis-backed queue (apalis) in rust-backend/src/jobs/mod.rs (async jobs)
- [ ] T057d [P] Configure Redis-backed rate limiter store in rust-backend/src/middleware/rate_limit.rs

### Broadcasting (Axum WebSocket)

- [ ] T058 Configure WebSocket broadcasting in rust-backend/src/routes/ws.rs (Axum WS + Redis pub/sub, pusher-compat — remplace Laravel Echo Server)
- [ ] T059 [P] Create NewMessage broadcast event in rust-backend/src/domain/messaging/events.rs
- [ ] T060 [P] Create PaymentStatusUpdated broadcast event in rust-backend/src/domain/payments/events.rs
- [ ] T061 [P] Create ContractStatusUpdated broadcast event in rust-backend/src/domain/contracts/events.rs

### Frontend Core

- [x] T062 Setup Next.js 16 App Router structure in frontend/app/
- [x] T063 [P] Configure TailwindCSS 3 in frontend/tailwind.config.ts with mobile-first breakpoints
- [x] T064 [P] Setup React Query (TanStack Query v5) provider in frontend/app/providers.tsx
- [x] T065 Configure PWA manifest in frontend/public/manifest.json
- [x] T066 Create authentication context in frontend/lib/auth/AuthContext.tsx with JWT Bearer token management
- [x] T067 [P] Create API client utilities in frontend/lib/api/client.ts with axios and JWT Bearer tokens
- [x] T068 [P] Create WebSocket client setup in frontend/lib/socket/echo.ts (Echo/Socket.io → Axum WS pusher-compat)
- [x] T069 [P] Install and configure React Leaflet in frontend/lib/maps/leaflet-config.ts for interactive maps
- [x] T070 Install and configure shadcn/ui base components in frontend/components/ui/

### Error Handling & Validation

- [ ] T071 Create global error type in rust-backend/src/error.rs (AppError → consistent structured JSON errors)
- [ ] T072 [P] Create validated extractors in rust-backend/src/extractors/validated_json.rs (validator derive — remplace FormRequests)
- [ ] T073 [P] Create input sanitization utilities in rust-backend/src/middleware/sanitize.rs (FR-089)
- [x] T074 Create error boundary component in frontend/components/ErrorBoundary.tsx

### Seeding & Testing Data

- [ ] T075 Create user seed/factory in rust-backend/src/db/seed/users.rs (fake data)
- [ ] T076 [P] Create listing seed/factory in rust-backend/src/db/seed/listings.rs
- [ ] T077 Create DatabaseSeeder in rust-backend/src/bin/seed.rs with test users and quartiers

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Publication Gratuite d'Annonces en 5 Minutes (Priority: P1) 🎯 MVP

**Goal**: Un propriétaire peut publier gratuitement une annonce immobilière en moins de 5 minutes avec 10 photos max, description, prix, caution, géolocalisation par quartier. Les chercheurs peuvent consulter les annonces et utiliser des filtres avancés sans créer de compte.

**Independent Test**: Un propriétaire crée un compte avec OTP SMS, publie une annonce d'appartement 2 chambres à Kaloum avec 5 photos, prix 2 500 000 GNF/mois, caution 3 mois, et vérifie qu'elle apparaît immédiatement dans les résultats de recherche Elasticsearch.

### Backend - Authentication (FR-001 to FR-005)

- [x] T078 [P] [US1] Create POST /api/auth/register handler in rust-backend/src/routes/auth.rs::register() with JWT token generation (FR-001 OTP SMS)
- [x] T079 [P] [US1] Create POST /api/auth/otp/verify handler in auth.rs::verify_otp() (FR-001 OTP validation)
- [x] T080 [P] [US1] Create POST /api/auth/login handler in auth.rs::login() with JWT token response (FR-003 phone + password, bcrypt compat)
- [x] T081 [P] [US1] Create POST /api/auth/logout handler in auth.rs::logout() with token revocation
- [x] T082 [P] [US1] Create GET /api/auth/me handler in auth.rs::me() to fetch authenticated user
- [x] T083 [P] [US1] Create PATCH /api/auth/me handler in auth.rs::update_profile() (FR-005 notification preferences, FR-062 4 toggles indépendants push/sms/email/whatsapp)
- [ ] T083a [P] [US1] Create POST /api/auth/password/forgot handler in auth.rs::forgot_password() — envoi OTP SMS (FR-004, SMS uniquement, pas d'email)
- [ ] T083b [P] [US1] Create POST /api/auth/password/reset handler in auth.rs::reset_password() — vérif OTP + nouveau hash bcrypt (FR-004)

### Backend - Listings CRUD (FR-006 to FR-015)

- [x] T084 [US1] Create POST /api/listings (create, AuthUser+ValidatedJson) + POST /api/listings/{id}/photos (owner-only, multipart → optimize → S3) handlers in domain/listings/handlers.rs (FR-006, FR-009, FR-011, FR-012). NB: geolocation/PostGIS différé.
- [ ] T085 [US1] Create optimize_listing_photos apalis job in rust-backend/src/jobs/optimize_listing_photos.rs using image + imageproc (FR-010 WebP conversion)
- [x] T086 [P] [US1] Create GET /api/listings/{id} handler in domain/listings/handlers.rs::show() with atomic view counter increment
- [x] T087 [P] [US1] Create PATCH /api/listings/{id} handler in listings.rs::update() (FR-013 title/description/photos only)
- [x] T088 [P] [US1] Create DELETE /api/listings/{id} handler in listings.rs::destroy() with soft delete
- [ ] T089 [US1] Create check_expired_listings scheduled job in rust-backend/src/jobs/check_expired_listings.rs (FR-014 auto-expire after 90 days)
- [ ] T090 [P] [US1] Create POST /api/listings/{id}/premium handler for badge URGENT, remontée 48h, photos pro (FR-015). ⏸️ DIFFÉRÉ : fonctionnalité payante → dépend du domaine Paiements (Phase 4). `options_premium` (JSONB) déjà en place, piloté par le flux de paiement.

### Backend - Search & Filters with Elasticsearch (FR-016 to FR-021)

- [x] T091 [US1] Create GET /api/listings/search handler in domain/listings/handlers.rs::search() — filtres + pagination via SeaORM/Postgres (FR-017 filtres, FR-018 tri date desc, FR-019 pagination, FR-020 fulltext ILIKE titre+description). NB: Elasticsearch (T092) reste un suivi pour la pertinence/perf (FR-094).
- [ ] T092 [US1] Configure Elasticsearch indexes in rust-backend/src/services/search.rs with searchable/filterable attributes, ranking rules (FR-094 <500ms)
- [ ] T093 [US1] Create index_listings_elasticsearch job/bin in rust-backend/src/jobs/index_listings_elasticsearch.rs
- [ ] T094 [P] [US1] Configure Elasticsearch mappings in rust-backend/config/elasticsearch-mappings.json with geospatial queries for PostGIS coordinates

### Frontend - Authentication UI

- [x] T095 [P] [US1] Create registration page in frontend/app/(public)/auth/register/page.tsx with phone input and OTP modal
- [x] T096 [P] [US1] Create login page in frontend/app/(public)/auth/login/page.tsx
- [x] T097 [P] [US1] Create OTP verification component in frontend/components/auth/OtpVerification.tsx with resend button (FR-001)
- [x] T098 [US1] Implement useAuth hook in frontend/lib/auth/useAuth.ts with React Query and JWT token management

### Frontend - Listing Publication UI

- [x] T099 [US1] Create listing publication page in frontend/app/(auth)/publier/page.tsx with 5-minute timer visible (FR-006)
- [x] T100 [US1] Create ListingForm component in frontend/components/listings/ListingForm.tsx with validation (FR-011 mandatory fields, FR-012 sélection caution 1-6 mois + calcul auto)
- [x] T101 [US1] Create PhotoUploader component in frontend/components/listings/PhotoUploader.tsx with drag-and-drop, 10 photos max (FR-009)
- [x] T102 [P] [US1] Create QuartierSelector component with React Leaflet map in frontend/components/listings/QuartierSelector.tsx (FR-008 predefined quartiers)
- [x] T103 [P] [US1] Create TypeBienSelector component in frontend/components/listings/TypeBienSelector.tsx (FR-007 7 types)

### Frontend - Search & Browse UI

- [x] T104 [US1] Create homepage in frontend/app/(public)/page.tsx with latest 20 listings and search bar
- [x] T105 [US1] Create search page in frontend/app/(public)/annonces/page.tsx with filters and pagination (FR-019 20/page + compteur "X annonces trouvées")
- [x] T106 [US1] Create SearchFilters component in frontend/components/listings/SearchFilters.tsx (FR-017 7 filters)
- [x] T107 [US1] Create ListingCard component in frontend/components/listings/ListingCard.tsx (FR-021 thumbnail, price, quartier, badge)
- [x] T108 [US1] Create listing detail page with React Leaflet map in frontend/app/(public)/annonces/[id]/page.tsx with photo gallery and contact button
- [x] T109 [US1] Implement useListings hook in frontend/lib/hooks/useListings.ts with React Query pagination and Elasticsearch results

### Testing & Validation

- [x] T110 [US1] Write integration test for listing publication flow in rust-backend/tests/listings_e2e.rs (axum-test 17 + testcontainers Postgres/Redis/MinIO) : register → login → create → search → show + upload photo (WebP → MinIO)
- [ ] T111 [US1] Write Playwright E2E test for User Story 1 in frontend/tests/e2e/user-story-1-publish-listing.spec.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - users can register (JWT), publish listings with photos optimized by `image`/`imageproc`, and searchers can browse/filter listings via Elasticsearch without authentication.

---

## Phase 4: User Story 2 - Génération Automatique de Contrats (Priority: P2)

**Goal**: Après accord verbal, la plateforme génère automatiquement un contrat de location conforme à la loi guinéenne 2016/037 via un formulaire guidé. Le contrat inclut toutes les clauses obligatoires et peut être prévisualisé avant envoi pour signature.

**Independent Test**: Un propriétaire et un locataire sont d'accord sur une location. Le propriétaire initie la génération d'un contrat de location résidentiel, remplit le formulaire en 5 minutes, prévisualise le PDF généré avec toutes les clauses, et l'envoie au locataire pour signature.

### Backend - Contract Generation (FR-022 to FR-027)

- [x] T112 [US2] Configure Typst (typst-as-lib, source → PDF) in rust-backend/src/services/pdf.rs — moteur pur-Rust sans navigateur (remplace headless-chrome/DomPDF ; police DejaVu chargée au runtime)
- [ ] T113 [US2] Create POST /api/contracts/generate handler in rust-backend/src/routes/contracts.rs::generate() (FR-023 3-step form)
- [ ] T114 [US2] Create contract service in rust-backend/src/services/contract.rs with PDF generation logic (FR-024 professional PDF)
- [ ] T115 [P] [US2] Create HTML template for bail_location_residentiel in rust-backend/templates/contracts/bail-location-residentiel.html (FR-024 conformité loi 2016/037)
- [ ] T116 [P] [US2] Create HTML template for bail_location_commercial in rust-backend/templates/contracts/bail-location-commercial.html
- [ ] T117 [P] [US2] Create HTML template for promesse_vente_terrain in rust-backend/templates/contracts/promesse-vente-terrain.html
- [ ] T118 [P] [US2] Create HTML template for mandat_gestion in rust-backend/templates/contracts/mandat-gestion.html
- [ ] T119 [P] [US2] Create HTML template for attestation_caution in rust-backend/templates/contracts/attestation-caution.html
- [ ] T120 [US2] Create GET /api/contracts/{id}/preview handler in contracts.rs::preview() with PDF streaming (FR-025)
- [ ] T121 [P] [US2] Create DELETE /api/contracts/{id} handler in contracts.rs::destroy() (FR-026 only if not signed)
- [ ] T122 [US2] Create POST /api/contracts/{id}/send handler in contracts.rs::send() with multi-channel notifications (FR-027 SMS, Email, Push, WhatsApp)

### Frontend - Contract Generation UI

- [x] T123 [US2] Create contract generation page in frontend/app/(auth)/contrats/generer/page.tsx with listing selector
- [x] T124 [US2] Create ContractForm component in frontend/components/contracts/ContractForm.tsx with 3-step wizard (FR-023)
- [x] T125 [US2] Create PDFPreview component in frontend/components/contracts/PDFPreview.tsx with zoom controls (FR-025 50%-200%)
- [x] T126 [US2] Create ContractTypeSelector component in frontend/components/contracts/ContractTypeSelector.tsx (FR-022 5 types)
- [x] T127 [US2] Implement useContracts hook in frontend/lib/hooks/useContracts.ts with React Query

### n8n Workflows

- [x] T128 [P] [US2] Create n8n workflow for contract sent notifications in n8n/workflows/signature-contrat-pdf.json (SMS, Email, Push, WhatsApp)

### Testing & Validation

- [ ] T129 [US2] Write integration test for contract generation in rust-backend/tests/contract_generation.rs (axum-test — verify PDF structure, clauses)
- [ ] T130 [US2] Write Playwright E2E test for User Story 2 in frontend/tests/e2e/user-story-2-generate-contract.spec.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - contracts can be generated with headless-chrome and previewed.

---

## Phase 5: User Story 3 - Signature Électronique OTP SMS (Priority: P3)

**Goal**: Les deux parties signent électroniquement le contrat via OTP SMS. Chaque signature est horodatée et un cachet électronique est apposé. Une fois toutes les signatures complètes, le contrat devient immutable et est archivé de manière sécurisée (chiffrement AES-256) pendant 10 ans minimum.

**Independent Test**: Un locataire reçoit un contrat à signer. Il consulte le contrat, clique sur "Signer", reçoit un OTP SMS, le saisit, et sa signature avec horodatage est ajoutée au PDF. Le propriétaire signe ensuite. Le contrat devient immutable et les deux parties reçoivent une copie par email.

### Backend - Electronic Signatures (FR-028 to FR-033)

- [ ] T131 [US3] Create POST /api/contracts/{id}/sign handler in rust-backend/src/routes/contracts.rs::sign() with OTP validation (FR-028, FR-031 transitions de statut brouillon→en_attente→partiellement_signé→signé_archivé)
- [ ] T132 [US3] Create signature service in rust-backend/src/services/signature.rs with SHA-256 hash generation (FR-030)
- [ ] T133 [US3] Implement signature watermark addition to PDF in rust-backend/src/services/contract.rs (FR-030 cachet électronique)
- [ ] T134 [US3] Create lock_signed_contract apalis job in rust-backend/src/jobs/lock_signed_contract.rs to make PDF immutable (FR-032, FR-037 envoi automatique copie signée par email + SMS aux 2 parties)
- [ ] T135 [US3] Create check_retraction_period scheduled job in rust-backend/src/jobs/check_retraction_period.rs (FR-033 48h countdown)

### Backend - Document Archival (FR-034 to FR-038)

- [ ] T136 [US3] Implement AES-256 encryption for signed PDFs via Vault Transit in rust-backend/src/services/vault_crypto.rs (FR-034 — remplace EncryptionService)
- [ ] T137 [US3] Create GET /api/contracts/{id}/download handler in contracts.rs::download() with watermark "Téléchargé par [Nom] le [Date]" (FR-036)
- [ ] T138 [US3] Create backup_signed_contracts scheduled job in rust-backend/src/jobs/backup_signed_contracts.rs (FR-038 daily 2h GMT)
- [ ] T138a [US3] Create contract_retention_policy scheduled job in rust-backend/src/jobs/contract_retention.rs (FR-035) : conservation 10 ans, préavis de suppression J-30 (notification + option de téléchargement), purge à 10 ans + 30 jours, interdiction de suppression manuelle avant échéance
- [ ] T139 [P] [US3] Create POST /api/contracts/{id}/cancel handler (FR-033 during 48h retraction period)

### Frontend - Signature UI

- [x] T140 [US3] Create contract signature page in frontend/app/(auth)/contrats/[id]/signer/page.tsx
- [x] T141 [US3] Create SignatureModal component in frontend/components/contracts/SignatureModal.tsx with OTP input (FR-028 4-step process)
- [x] T142 [US3] Create RetractionCountdown component in frontend/components/contracts/RetractionCountdown.tsx (FR-033 48h timer)
- [x] T143 [US3] Create signed contracts list page in frontend/app/(auth)/dashboard/mes-contrats/page.tsx with download links

### Testing & Validation

- [ ] T144 [US3] Write integration test for signature flow in rust-backend/tests/contract_signature.rs (axum-test — OTP validation, hash integrity)
- [x] T145 [US3] Write Playwright E2E test for User Story 3 in frontend/e2e/contract-signature.spec.ts

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - contracts can be signed electronically and archived securely (Vault Transit).

---

## Phase 6: User Story 4 - Paiement Commission 50% Loyer le Jour de la Caution (Priority: P4)

**Goal**: Après signature du contrat, le locataire paie la caution (1-6 mois de loyer) + l'avance + la commission plateforme (50% d'un mois de loyer) via Orange Money ou MTN Mobile Money. Le paiement de la commission est obligatoire le même jour que la caution. La commission est collectée par la plateforme AVANT que l'argent de la caution ne soit transféré au propriétaire.

**Independent Test**: Un contrat de bail est signé (loyer 2 500 000 GNF/mois, caution 1 mois, avance 3 mois = 7 500 000 GNF). Le locataire accède à son dashboard "Mes paiements", voit une facture de 11 250 000 GNF (7 500 000 avance + 2 500 000 caution + 1 250 000 commission), paie via Orange Money avec 2FA, l'argent est placé en escrow, la commission est prélevée par la plateforme, et le propriétaire reçoit 10 000 000 GNF après validation.

### Backend - Payments & Escrow (FR-039 to FR-052)

- [ ] T146 [US4] Create commission calculator in rust-backend/src/services/commission_calculator.rs (FR-040 50% location, 1% vente terrain, 2% vente maison)
- [ ] T147 [US4] Create POST /api/payments/initiate handler in rust-backend/src/routes/payments.rs::initiate() (FR-043 step 1-3, FR-045 2FA OTP obligatoire pour paiement > 500 000 GNF)
- [ ] T148 [US4] Create escrow service in rust-backend/src/services/escrow.rs with 48h timeout logic + SeaORM atomic transactions (FR-044)
- [ ] T149 [P] [US4] Create POST /api/payments/webhooks/orange handler in rust-backend/src/routes/webhooks.rs::orange_money() (FR-043 step 4 webhook)
- [ ] T150 [P] [US4] Create POST /api/payments/webhooks/mtn handler in webhooks.rs::mtn_momo() (FR-043 step 4 webhook)
- [ ] T151 [US4] Create process_payment_confirmation apalis job in rust-backend/src/jobs/process_payment_confirmation.rs (FR-043 step 5-7, FR-051 gestion des échecs de paiement : max 3 tentatives puis proposition paiement espèces)
- [ ] T152 [US4] Create POST /api/payments/{id}/validate handler in payments.rs::validate_by_landlord() (FR-044 landlord confirmation)
- [ ] T153 [US4] Create check_escrow_timeouts scheduled job in rust-backend/src/jobs/check_escrow_timeouts.rs (FR-044 48h auto-release)
- [ ] T154 [US4] Create quittance service in rust-backend/src/services/quittance.rs with PDF generation (FR-046)
- [ ] T155 [P] [US4] Create HTML template for quittance in rust-backend/templates/payments/quittance.html
- [ ] T156 [US4] Create GET /api/payments handler in payments.rs::index() with filters (FR-048 history table)
- [ ] T157 [P] [US4] Create POST /api/payments/{id}/refund handler in payments.rs::refund() (FR-049 dispute refund)
- [ ] T158 [P] [US4] Create POST /api/payments/cash handler in payments.rs::cash_payment() (FR-052 fallback)

### Frontend - Payments UI

- [x] T159 [US4] Create payments dashboard page in frontend/app/(auth)/dashboard/mes-paiements/page.tsx (FR-048)
- [x] T160 [US4] Create InvoiceDetail component in frontend/components/payments/InvoiceDetail.tsx (FR-041 facture with 3 sections)
- [x] T161 [US4] Create PaymentForm component in frontend/components/payments/PaymentForm.tsx (Orange/MTN selector, 2FA OTP)
- [x] T162 [US4] Create PaymentHistory component in frontend/components/payments/PaymentHistory.tsx with filters and CSV export (FR-048)
- [x] T163 [US4] Create TransparencyWarning component in frontend/components/payments/TransparencyWarning.tsx (FR-042 commission non-refundable, FR-050 récapitulatif transparent des frais AVANT validation)
- [x] T164 [US4] Implement usePayments hook in frontend/lib/hooks/usePayments.ts with React Query

### n8n Workflows

- [x] T165 [P] [US4] Create n8n workflow for payment confirmation notifications in n8n/workflows/paiement-quittance.json (FR-047 envoi quittance PDF par 3 canaux : email 2 parties + SMS + push)
- [x] T166 [P] [US4] Create n8n workflow for escrow **reminder notifications** in n8n/workflows/escrow-relances.json (relances propriétaire J+1/J+1.5/J+2). Le **déblocage** escrow 48h/72h est géré par le job Rust T153 (transactionnel, ACID) — pas de double exécution.

### Testing & Validation

- [ ] T167 [US4] Write integration test for payment flow in rust-backend/tests/payment_flow.rs (axum-test — commission calculation, escrow, webhooks) — couverture stricte (domaine 🔴 paiements)
- [ ] T168 [US4] Write Playwright E2E test for User Story 4 in frontend/e2e/user-story-4-payment-commission.spec.ts

**Checkpoint**: At this point, User Stories 1-4 should all work independently - full transaction flow from listing to payment is functional.

---

## Phase 7: User Story 5 - Programme de Certification (Bronze/Argent/Or/Diamant) (Priority: P5)

**Goal**: Les utilisateurs progressent dans un programme de certification en 4 niveaux basé sur le nombre de transactions complétées, la vérification de documents et l'absence de litiges. Chaque niveau débloque des avantages (badge visible, priorité messagerie, réduction commissions).

**Independent Test**: Un propriétaire s'inscrit (statut Bronze), complète sa vérification CNI + titre foncier (passe Argent), complète 5 transactions sans litige (passe Or), atteint 20 transactions avec note moyenne 4.8/5 (passe Diamant). Son badge Diamant s'affiche sur toutes ses annonces.

### Backend - Certification (FR-053 to FR-058)

- [ ] T169 [US5] Create certification service in rust-backend/src/services/certification.rs with badge upgrade/downgrade logic using rôles RBAC natifs (FR-053, FR-056 avantages progressifs par niveau : priorité messagerie, réductions commission)
- [ ] T170 [US5] Create POST /api/certifications/upload handler in rust-backend/src/routes/certifications.rs::upload() (FR-054 CNI, titre foncier)
- [ ] T171 [US5] Create POST /api/certifications/{id}/verify handler in certifications.rs::verify() with garde RBAC natif (admin) (FR-054)
- [ ] T172 [US5] Create GET /api/certifications/me handler in certifications.rs::my() (FR-057 dashboard progression)
- [ ] T173 [US5] Create check_badge_upgrades scheduled job in rust-backend/src/jobs/check_badge_upgrades.rs (FR-053 auto-upgrade)
- [ ] T174 [US5] Create check_badge_downgrades scheduled job in rust-backend/src/jobs/check_badge_downgrades.rs (FR-058 auto-downgrade)

### Frontend - Certification UI

- [x] T175 [US5] Create certification page in frontend/app/(auth)/dashboard/certification/page.tsx (FR-057 dashboard)
- [x] T176 [US5] Create BadgeDisplay component in frontend/components/certifications/BadgeDisplay.tsx (FR-055 visible on profile, listings, messages)
- [x] T177 [US5] Create ProgressTracker component in frontend/components/certifications/ProgressTracker.tsx (FR-057 progress bar)
- [x] T178 [US5] Create DocumentUploader component in frontend/components/certifications/DocumentUploader.tsx (FR-054 CNI/titre foncier)
- [x] T179 [US5] Implement useCertification hook in frontend/lib/hooks/useCertification.ts

### Testing & Validation

- [ ] T180 [US5] Write integration test for certification flow in rust-backend/tests/certification.rs (axum-test — badge upgrades via RBAC natif, downgrades)
- [x] T181 [US5] Write Playwright E2E test for User Story 5 in frontend/e2e/user-story-5-certification.spec.ts

**Checkpoint**: Certification program is functional with automatic badge progression via rôles RBAC natifs.

---

## Phase 8: User Story 6 - Messagerie Sécurisée avec Notifications Multicanales (Priority: P6)

**Goal**: Les chercheurs et propriétaires communiquent via une messagerie interne (texte + vocal) sans révéler leurs numéros de téléphone. Les notifications sont envoyées via 4 canaux : Push app, SMS, Email, WhatsApp (opt-in). Les messages sont conservés avec horodatage et statut de lecture.

**Independent Test**: Un chercheur envoie un message "Bonjour, le bien est-il toujours disponible ?" au propriétaire. Le propriétaire (qui a activé WhatsApp) reçoit 4 notifications simultanées (Push, SMS, Email, WhatsApp), répond "Oui, disponible dès le 1er février", et le chercheur voit la réponse en temps réel avec statut "Lu à 14:35".

### Backend - Messaging (FR-059 to FR-066)

- [ ] T182 [US6] Create POST /api/messaging/{id}/messages handler in rust-backend/src/routes/messaging.rs::send_message() (FR-059)
- [ ] T183 [US6] Create GET /api/messaging/conversations handler in messaging.rs::conversations() (FR-063)
- [ ] T184 [US6] Create GET /api/messaging/{id}/messages handler in messaging.rs::messages() with pagination (FR-063)
- [ ] T185 [P] [US6] Create POST /api/messaging/{id}/report handler in messaging.rs::report_message() (FR-064)
- [ ] T186 [US6] Create message notification service in rust-backend/src/services/message_notification.rs with 4-channel logic (FR-061)
- [ ] T187 [US6] Create fraud detection service in rust-backend/src/services/fraud_detection.rs (FR-065 keyword detection)
- [ ] T188 [US6] Create rate limit service in rust-backend/src/services/rate_limit.rs (FR-066 50 msg/h, 10 conv/day)

### Backend - Real-Time Events

- [ ] T189 [P] [US6] Implement NewMessage broadcast to private WS channel in rust-backend/src/domain/messaging/events.rs
- [ ] T190 [P] [US6] Implement TypingIndicator broadcast event in rust-backend/src/domain/messaging/events.rs
- [ ] T191 [P] [US6] Implement MessageRead broadcast event in rust-backend/src/domain/messaging/events.rs

### Frontend - Messaging UI

- [x] T192 [US6] Create messaging page in frontend/app/(auth)/dashboard/messagerie/page.tsx
- [x] T193 [US6] Create ConversationList component in frontend/components/messaging/ConversationList.tsx
- [x] T194 [US6] Create MessageThread component in frontend/components/messaging/MessageThread.tsx with real-time updates
- [x] T195 [US6] Create MessageInput component in frontend/components/messaging/MessageInput.tsx (text, vocal, photo FR-059)
- [x] T196 [US6] Create PhoneMaskingDisplay component in frontend/components/messaging/PhoneMaskingDisplay.tsx (FR-060)
- [x] T197 [US6] Implement useMessaging hook in frontend/lib/hooks/useMessaging.ts with WebSocket listeners (Axum WS)

### n8n Workflows

- [x] T198 [P] [US6] Create n8n workflow for message notifications in n8n/workflows/nouveau-message-alerts.json (4 channels)

### Testing & Validation

- [ ] T199 [US6] Write integration test for messaging in rust-backend/tests/messaging.rs (axum-test — phone masking, notifications, anti-spam)
- [x] T200 [US6] Write Playwright E2E test for User Story 6 in frontend/e2e/user-story-6-messaging.spec.ts

**Checkpoint**: Real-time messaging with multi-channel notifications is functional via Axum WebSocket (pusher-compat) + Socket.IO.

---

## Phase 8b: User Story 10 - Planification de Visites (Priority: P6)

**Goal**: Un chercheur demande une visite d'une annonce (créneau date/heure) ; le propriétaire confirme/annule/complète, y compris via un lien public sans compte. Notifications multi-canal, statuts EN_ATTENTE → CONFIRMEE → COMPLETEE / ANNULEE, statistiques par annonce.

**Independent Test**: Un chercheur demande une visite (Kaloum, samedi 10h). Le propriétaire reçoit une notification, confirme via le lien public, les deux parties sont notifiées, statut → CONFIRMEE ; après la visite, statut → COMPLETEE et comptée dans les stats de l'annonce.

### Backend - Visits (FR-099 to FR-101)

- [ ] T200a [US10] Create POST /api/visits handler in rust-backend/src/routes/visits.rs::request() (FR-099 création + notif propriétaire, créneau futur uniquement)
- [ ] T200b [P] [US10] Create PATCH /api/visits/{id}/status handler in visits.rs::update_status() (FR-100 confirm/cancel/complete + transitions)
- [ ] T200c [P] [US10] Create GET /api/visits/public/{token} + POST .../respond handlers in visits.rs (FR-100 réponse propriétaire via lien public sans auth)
- [ ] T200d [P] [US10] Create GET /api/listings/{id}/visits/stats handler in visits.rs::stats() (FR-101 statistiques par annonce)
- [ ] T200e [US10] Reuse MessageNotificationService for visit notifications (4 canaux) in rust-backend/src/services/message_notification.rs (FR-099/100)

### Frontend - Visits UI

- [ ] T200f [US10] Create VisitRequestModal + VisitList components in frontend/components/visits/ and useVisits hook in frontend/lib/hooks/useVisits.ts
- [ ] T200g [US10] Create public visit response page in frontend/app/(public)/visites/[token]/page.tsx

### Testing & Validation

- [ ] T200h [US10] Write integration test for visits flow in rust-backend/tests/visit.rs (axum-test — statut transitions, lien public, créneau passé rejeté)

**Checkpoint**: Visit scheduling is functional (request → confirm via public link → complete + stats).

---

## Phase 9: User Story 7 - Système de Notation et Médiation de Litiges (Priority: P7)

**Goal**: Après une transaction complétée, les deux parties se notent mutuellement (1-5 étoiles) avec commentaire obligatoire. Les commentaires sont modérés automatiquement. En cas de litige, un système de médiation gratuite permet de résoudre à l'amiable dans un délai de 7 jours.

**Independent Test**: Un locataire et un propriétaire complètent une transaction. Le locataire note le propriétaire 5 étoiles "Très professionnel". Le propriétaire note le locataire 4 étoiles "Bon locataire mais retard paiement 1er mois". Les notes apparaissent sur leurs profils publics après modération automatique.

### Backend - Ratings (FR-067 to FR-071)

- [ ] T201 [US7] Create POST /api/ratings handler in rust-backend/src/routes/ratings.rs::store() (FR-067 mutual rating)
- [ ] T202 [US7] Create GET /api/ratings/{userId} handler in ratings.rs::show() (FR-070 public profile ratings)
- [ ] T203 [US7] Create content moderation service in rust-backend/src/services/content_moderation.rs (FR-069 auto-moderation keywords)
- [ ] T204 [US7] Create update_average_ratings scheduled job in rust-backend/src/jobs/update_average_ratings.rs (FR-071)

### Backend - Disputes (FR-072 to FR-075)

- [ ] T205 [US7] Create POST /api/disputes handler in rust-backend/src/routes/disputes.rs::store() (FR-072)
- [ ] T206 [US7] Create GET /api/disputes handler in disputes.rs::index() (user disputes list)
- [ ] T207 [P] [US7] Create PATCH /api/disputes/{id}/assign handler in disputes.rs::assign_mediator() with garde RBAC natif (admin) (FR-073)
- [ ] T208 [P] [US7] Create PATCH /api/disputes/{id}/resolve handler in disputes.rs::resolve() (FR-074 3 issues)
- [ ] T209 [US7] Create assign_mediator scheduled job in rust-backend/src/jobs/assign_mediator.rs (FR-073 auto-assign within 48h)

### Frontend - Ratings UI

- [x] T210 [US7] Create rating submission page in frontend/app/(auth)/notations/[transactionId]/page.tsx
- [x] T211 [US7] Create RatingForm component in frontend/components/ratings/RatingForm.tsx (FR-067 3 criteria, FR-068 commentaire obligatoire 20-500 caractères)
- [x] T212 [US7] Create RatingsDisplay component in frontend/components/ratings/RatingsDisplay.tsx (FR-070 on public profiles)
- [x] T213 [US7] Implement useRatings hook in frontend/lib/hooks/useRatings.ts

### Frontend - Disputes UI

- [x] T214 [US7] Create dispute creation page in frontend/app/(auth)/litiges/creer/page.tsx
- [x] T215 [US7] Create DisputeForm component in frontend/components/disputes/DisputeForm.tsx (FR-072 with file uploads)
- [x] T216 [US7] Create disputes list page in frontend/app/(auth)/dashboard/mes-litiges/page.tsx
- [x] T217 [US7] Implement useDisputes hook in frontend/lib/hooks/useDisputes.ts

### Testing & Validation

- [ ] T218 [US7] Write integration test for ratings in rust-backend/tests/rating.rs (axum-test — moderation, average calculation)
- [ ] T219 [US7] Write integration test for disputes in rust-backend/tests/dispute.rs (axum-test — mediator assignment via RBAC natif, resolution)
- [x] T220 [US7] Write Playwright E2E test for User Story 7 in frontend/tests/e2e/user-story-7-ratings-disputes.spec.ts

**Checkpoint**: Rating and dispute mediation systems are functional.

---

## Phase 10: User Story 8 - Module Assurance Locative (Priority: P8 - Phase 2)

**Goal**: Les locataires peuvent souscrire à "SÉJOUR SEREIN" (2% du loyer mensuel) pour se protéger contre les expulsions abusives. Les propriétaires peuvent souscrire à "LOYER GARANTI" pour se protéger contre les impayés.

**Independent Test**: Un locataire souscrit à "SÉJOUR SEREIN" pour 50 000 GNF/mois (2% de 2 500 000 GNF). Après 6 mois, le propriétaire tente de l'expulser sans raison valable. Le locataire active l'assurance et reçoit 7 500 000 GNF en compensation.

### Backend - Insurance (FR-076 to FR-080)

- [ ] T221 [US8] Create POST /api/insurances/subscribe handler in rust-backend/src/routes/insurances.rs::subscribe() (FR-076, FR-079 ajout automatique de la prime à la facture mensuelle)
- [ ] T222 [US8] Create POST /api/insurances/{id}/claim handler in insurances.rs::claim() (FR-077, FR-078)
- [ ] T223 [US8] Create GET /api/insurances/me handler in insurances.rs::my() (active policies)
- [ ] T224 [US8] Create insurance certificate service in rust-backend/src/services/insurance_certificate.rs (FR-080 PDF generation)
- [ ] T225 [P] [US8] Create HTML template for insurance certificate in rust-backend/templates/insurances/certificat.html

### Frontend - Insurance UI

- [x] T226 [US8] Create insurance subscription page in frontend/app/(auth)/assurances/souscrire/page.tsx
- [x] T227 [US8] Create InsuranceOptions component in frontend/components/insurances/InsuranceOptions.tsx (SÉJOUR SEREIN, LOYER GARANTI)
- [x] T228 [US8] Create insurance claims page in frontend/app/(auth)/assurances/reclamations/page.tsx
- [x] T229 [US8] Implement useInsurances hook in frontend/lib/hooks/useInsurances.ts

### Testing & Validation

- [ ] T230 [US8] Write integration test for insurance in rust-backend/tests/insurance.rs (axum-test)
- [x] T231 [US8] Write Playwright E2E test for User Story 8 in frontend/tests/e2e/user-story-8-insurance.spec.ts

**Checkpoint**: Insurance module is functional (Phase 2 feature).

---

## Phase 11: User Story 9 - Interface Multilingue pour la Diaspora (Priority: P9 - Phase 2)

**Goal**: La diaspora guinéenne peut utiliser l'interface en français ou en arabe. Les notifications respectent les fuseaux horaires. Les achats de terrains nécessitent une vérification renforcée du titre foncier par ImmoGuinée.

**Independent Test**: Un Guinéen vivant en France (UTC+1) consulte l'interface en français, trouve un terrain à Dubréka sur React Leaflet map, reçoit des notifications WhatsApp adaptées à son fuseau horaire, demande une vérification titre foncier, et achète après validation.

### Backend - Internationalization (FR-092 Phase 2)

- [ ] T232 [US9] Create GET /api/locales handler in rust-backend/src/routes/locales.rs::index() (list available languages)
- [ ] T233 [US9] Create PATCH /api/auth/me/locale handler in rust-backend/src/routes/auth.rs::update_locale() (save user language preference)
- [ ] T234 [US9] Create timezone service in rust-backend/src/services/timezone.rs (chrono-tz) (FR-009 notification timing)
- [ ] T235 [US9] Create POST /api/certifications/diaspora/verify handler in rust-backend/src/routes/certifications.rs::verify_diaspora() (enhanced verification FR-009)

### Frontend - i18n

- [x] T236 [US9] Setup next-i18next in frontend/lib/i18n/config.ts
- [x] T237 [P] [US9] Create French translations in frontend/public/locales/fr.json
- [x] T238 [P] [US9] Create Arabic translations in frontend/public/locales/ar.json
- [x] T239 [US9] Create LanguageSelector component in frontend/components/ui/LanguageSelector.tsx
- [x] T240 [US9] Create useLocale hook in frontend/lib/hooks/useLocale.ts (timezone detection & i18n)

### Testing & Validation

- [ ] T241 [US9] Write integration test for multilingual in rust-backend/tests/locale.rs (axum-test)
- [x] T242 [US9] Write Playwright E2E test for User Story 9 in frontend/tests/e2e/user-story-9-i18n.spec.ts

**Checkpoint**: All 9 user stories are now implemented on the **Rust/Axum + Next.js 16** stack.

---

## Phase 12: Admin Panel with RBAC natif (FR-081 to FR-085)

**Purpose**: Administrative tools for moderation, user management, analytics, and audit logs

### Backend - Admin Endpoints

- [ ] T243 [P] Create GET /api/admin/analytics handler in rust-backend/src/routes/admin.rs::analytics() with RBAC natif guard (FR-084 15 KPIs)
- [ ] T244 [P] Create GET /api/admin/moderation/listings handler in admin.rs::moderation_queue() (FR-081)
- [ ] T245 [P] Create PATCH /api/admin/moderation/listings/{id} handler in admin.rs::moderate_listing() (FR-082 suspend/delete)
- [ ] T246 [P] Create GET /api/admin/users handler in admin.rs::users() (FR-083)
- [ ] T247 [P] Create PATCH /api/admin/users/{id} handler in admin.rs::manage_user() with RBAC natif role updates (FR-083 suspend/ban/downgrade)
- [ ] T248 [P] Create GET /api/admin/disputes handler in admin.rs::disputes() (FR-073 mediation queue)
- [ ] T249 [P] Create GET /api/admin/logs handler in admin.rs::audit_logs() (FR-085)

### Frontend - Admin UI

- [x] T250 Create useAdmin hook in frontend/lib/hooks/useAdmin.ts (admin operations)
- [x] T251 [P] Create admin dashboard page in frontend/app/(admin)/admin/page.tsx with 15 KPIs (FR-084)
- [x] T252 [P] Create moderation page in frontend/app/(admin)/admin/moderation/page.tsx (FR-081)
- [x] T253 [P] Create users management page in frontend/app/(admin)/admin/users/page.tsx (FR-083)
- [x] T254 [P] Create audit logs page in frontend/app/(admin)/admin/logs/page.tsx (FR-085)
- [ ] T255 [P] Write integration tests for admin in rust-backend/tests/admin.rs (axum-test)

---

## Phase 13: Security & Performance (FR-086 to FR-098)

**Purpose**: Security hardening, performance optimization with Elasticsearch and Varnish, and monitoring

### Backend - Security

- [ ] T256 [P] Apply the VaultCryptoService (créé en T136) to the remaining sensitive fields per FR-086 : documents d'identité (CNI/titres), messages de la messagerie, références de transaction Mobile Money (chiffrement AES-256 via Vault Transit — ne pas réimplémenter le service)
- [ ] T257 [P] Configure rate limiting Tower layer in rust-backend/src/middleware/rate_limit.rs (FR-087)
- [ ] T258 [P] Add CSRF protection for stateful endpoints (tower-sessions) in rust-backend/src/auth/sessions.rs (FR-088)
- [ ] T259 [P] Implement input sanitization in rust-backend/src/middleware/sanitize.rs (FR-089)
- [x] T260 Configure SSL/TLS with Let's Encrypt in docker/traefik/traefik.yml (FR-091)
- [ ] T261 [P] Add security headers Tower layer in rust-backend/src/middleware/security_headers.rs (HSTS, CSP, X-Frame-Options) — scaffold en place
- [ ] T261a [P] Wire Vault client (vaultrs) in rust-backend/src/state.rs for secrets (KV) + crypto (Transit) — remplace Docker Secrets

### Backend - Performance

- [ ] T262 [P] Create Redis caching for popular listings in rust-backend/src/services/cache.rs (deadpool-redis) (FR-095)
- [x] T263 [P] Configure Varnish VCL rules for static asset caching in docker/varnish/default.vcl (FR-096)
- [ ] T264 [P] Add/verify PostgreSQL indexes for search optimization (in migrations, verify with EXPLAIN queries FR-094)
- [x] T265 Configure CDN for static assets in frontend/next.config.js with Varnish integration (FR-096)
- [ ] T266 Setup database read replicas in docker/docker-compose.prod.yml (FR-097)

### Monitoring & Observability

- [ ] T267 [P] Setup tracing + tracing-subscriber (JSON) instrumentation in rust-backend/src/main.rs (remplace Laravel Telescope) — scaffold en place
- [x] T268 [P] Create Grafana dashboard for performance metrics in monitoring/grafana/dashboards/performance.json (FR-098)
- [x] T269 [P] Create Grafana dashboard for business metrics in monitoring/grafana/dashboards/business-metrics.json
- [ ] T270 [P] Expose Prometheus metrics endpoint in rust-backend/src/routes/metrics.rs (metrics-exporter-prometheus) + scraping config monitoring/prometheus/prometheus.yml (FR-098)
- [ ] T271 [P] Setup Sentry error tracking in rust-backend/src/main.rs (sentry crate) and frontend/lib/sentry.ts
- [x] T272 [P] Setup Logrocket session replay in frontend/lib/logrocket.ts

### Testing & Validation

- [ ] T273 Write k6 load test for Elasticsearch search performance in rust-backend/tests/load/search-performance.js (FR-094 <500ms)
- [ ] T274 Write k6 load test for concurrent users in rust-backend/tests/load/concurrent-users.js (FR-097 10K users)
- [ ] T275 Run security audit with `cargo audit` and npm audit

---

## Phase 14: DevOps & Deployment

**Purpose**: Production deployment with Docker Swarm and CapRover options, CI/CD, and infrastructure

### Docker & Orchestration

- [ ] T276 [P] Finalize docker/docker-compose.yml with all services (PostgreSQL+PostGIS, Redis, Elasticsearch, Varnish, MinIO, Vault, n8n, Evolution API, Traefik, Grafana, Prometheus, PgAdmin, rust-backend, apalis-worker, scheduler, etc.)
- [ ] T277 [P] Create docker/docker-compose.prod.yml for production environment
- [ ] T278 [P] Create docker/docker-swarm.yml for Docker Swarm orchestration
- [ ] T279 [P] Create rust-backend.Dockerfile (multi-stage: cargo build --release → distroless/debian-slim runtime) for CapRover deployment
- [ ] T280 [P] Create docker/rust/Dockerfile for Docker Compose local development (cargo-watch hot reload)
- [ ] T281 Setup health checks for all services in Docker Compose (postgres, redis, elasticsearch, minio, vault, rust-backend /api/health)
- [ ] T282 [P] Configure CapRover deployment: captain-definition, .caprover/config.json, .caprover/one-click-apps/immoguinee-full-stack.json
- [ ] T282a [P] Update DEPLOYMENT.md guide with Docker Compose, CapRover, and Docker Swarm instructions for Rust backend
- [x] T282b [P] Create docker/README.md with service documentation, commands, troubleshooting

### CI/CD

- [ ] T283 [P] Create GitHub Actions workflow for backend tests in .github/workflows/rust-backend-ci.yml (fmt, clippy, test, audit)
- [x] T284 [P] Create GitHub Actions workflow for frontend tests in .github/workflows/frontend-ci.yml
- [ ] T285 [P] Create GitHub Actions workflow for deployment in .github/workflows/deploy.yml (build image Rust, push, deploy)
- [ ] T286 Setup environment secrets in GitHub repository settings + Vault bootstrap

### Backups & Recovery

- [ ] T287 [P] Create backup_database scheduled job in rust-backend/src/jobs/backup_database.rs (FR-090 daily 2h GMT, pg_dump)
- [ ] T288 [P] Create restore_database bin/command for disaster recovery in rust-backend/src/bin/restore.rs
- [ ] T289 Setup automated backup testing (1st of each month FR-090)

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, final testing, and quality assurance

### Documentation

- [ ] T290 [P] Update rust-backend/README.md with cargo setup instructions, JWT/Vault configuration, Elasticsearch setup
- [ ] T291 [P] Update frontend/README.md with Next.js 16 development instructions, React Leaflet usage
- [ ] T292 [P] Update specs/001-immog-platform/quickstart.md with full developer onboarding guide for Rust/Axum + Next.js 16
- [ ] T293 [P] Create API documentation (utoipa/OpenAPI) in rust-backend/docs/api/
- [ ] T294 [P] Create frontend component documentation with Storybook (optional)

### End-to-End Testing

- [ ] T295 Run all Playwright E2E tests for all 9 user stories (contre le backend Rust basculé)
- [ ] T296 [P] Perform manual QA testing on mobile devices (iOS Safari, Android Chrome)
- [ ] T297 [P] Perform manual QA testing on 3G throttled connection (FR-093 <3s load)
- [ ] T298 Validate all 20 Success Criteria (SC-001 to SC-020) from spec.md

### Legal & Compliance

- [ ] T299 [P] Legal review of generated contracts by Guinean lawyer (FR-005 conformité loi 2016/037)
- [ ] T300 [P] Register with Guinea Mobile Money providers (Orange, MTN) as approved partner (FR-092)
- [ ] T301 [P] Privacy policy and terms of service review (FR-092 RGPD local)

### Performance Optimization

- [ ] T302 [P] Optimize frontend bundle size with Next.js 16 bundle analyzer
- [ ] T303 [P] Optimize images with `image`/`imageproc` (already in T085, verify compression quality)
- [ ] T304 [P] Verify Varnish cache hit ratio and tune VCL rules (FR-093)
- [ ] T305 Run Lighthouse audit for all public pages (target: >90 performance score)

### Final Validation

- [ ] T306 Run quickstart.md validation (verify new developer can setup Rust/Axum + Next.js 16 project from scratch)
- [ ] T307 Verify all 98 Functional Requirements (FR-001 to FR-098) are implemented on the Rust backend
- [ ] T308 Verify all 9 User Stories can be tested independently
- [ ] T309 Create production deployment checklist
- [ ] T310 Perform load testing with 10,000 concurrent users (SC-012)
- [ ] T311 Validate 99.5% uptime monitoring setup (SC-013)
- [ ] T312 Final security audit and penetration testing

---

## Ordre de construction & mise en production

Le backend Rust est construit domaine par domaine, du plus simple au plus sensible. Chaque domaine est
mis en ligne dès qu'il est implémenté, testé (unit + intégration axum-test) et validé fonctionnellement :

Fondations 🟢 → Listings 🟡 → Visites+Messagerie 🟡 → Contrats 🟠 → **Paiements 🔴 (tests stricts)** → Admin/Modération/Facebook/Notifications 🟠.

> 🔴 **Aucune mise en production sans le mot `deploy`** (voir CLAUDE.md). Le domaine Paiements exige une
> couverture de tests stricte (calcul commission, escrow, webhooks) avant toute mise en ligne.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-11)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9)
- **Admin Panel (Phase 12)**: Can proceed in parallel with user stories after Foundational
- **Security & Performance (Phase 13)**: Depends on core user stories (Phase 3-7 minimum)
- **DevOps (Phase 14)**: Can start after Phase 1, proceed in parallel
- **Polish (Phase 15)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational - No dependencies on other stories
- **US2 (P2)**: Can start after Foundational - No dependencies on other stories (uses listings from US1 but independently testable)
- **US3 (P3)**: Depends on US2 completion (needs contracts to sign)
- **US4 (P4)**: Depends on US3 completion (needs signed contracts for payment)
- **US5 (P5)**: Can start after Foundational - No dependencies on other stories (badge system is independent)
- **US6 (P6)**: Can start after US1 (needs listings for conversations context, but messaging is independent)
- **US7 (P7)**: Depends on US4 (needs completed transactions for ratings)
- **US8 (P8)**: Depends on US4 (needs contracts and payments for insurance)
- **US9 (P9)**: Can start after Foundational - No dependencies (i18n is cross-cutting)
- **US10 (P6)**: Depends on US1 (needs listings) ; reuses messaging notifications (US6). Visit scheduling is otherwise independent.

### Critical Path

```
Phase 1 (Setup)
  → Phase 2 (Foundational with Axum, oxide-auth/JWT, SeaORM, Elasticsearch, PostGIS, Vault)
    → Phase 3 (US1: Listings with Elasticsearch search)
      → Phase 4 (US2: Contracts with headless-chrome PDF)
        → Phase 5 (US3: Signatures)
          → Phase 6 (US4: Payments)
            → Phase 9 (US7: Ratings)
```

**Parallel Track 1** (can start after Foundational):
```
Phase 2 (Foundational) → Phase 7 (US5: Certification with RBAC natif)
```

**Parallel Track 2** (can start after US1):
```
Phase 3 (US1) → Phase 8 (US6: Messaging with Axum WebSocket)
```

**Parallel Track 3** (Phase 2 features):
```
Phase 6 (US4) → Phase 10 (US8: Insurance) | Phase 11 (US9: i18n)
```

### Technology-Specific Dependencies

- **oxide-auth / JWT** (T034-T035): Must complete before any auth endpoints (T078+)
- **Vault** (T035, T261a): Must be wired before auth (JWT secret) + crypto (Transit)
- **Redis 7+** (T057a-T057d): Must complete before cache/sessions/queues/broadcasting (T039, T085, T262+)
- **Elasticsearch** (T054, T092): Must complete before search endpoints (T091)
- **PostGIS** (T011): Must complete before geolocation features (T084, T102)
- **RBAC natif** (T037-T038): Must complete before admin endpoints (T243+) and certification (T169)
- **image/imageproc** (T055): Must complete before photo optimization (T085)
- **Varnish** (T057, T263-T264): Can be configured in parallel with development
- **React Leaflet** (T069): Must complete before map components (T102, T108)

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Backend entities (SeaORM) before services
- Backend services before handlers (routes)
- Backend handlers before frontend hooks
- Frontend hooks before frontend components
- Core implementation before integration
- Story complete + tests green before mise en ligne du domaine

### Parallel Opportunities

#### Phase 1 (Setup)
- T002 (Next.js init) || T001 (Rust crate init)
- T003 (Docker Compose) || T004 (Env files) || T005 (ESLint) || T006 (rustfmt/clippy) || T009 (Monitoring)

#### Phase 2 (Foundational)
- All migrations T016-T022 can run in parallel
- All entities T027-T033 can run in parallel
- All domain/repositories T043-T047 can run in parallel
- All external integrations T048-T057 can run in parallel
- All broadcast events T059-T061 can run in parallel
- All frontend setup T062-T070 can run in parallel

#### User Stories
- **After Foundational phase completes**: US1, US5, US9 can start in parallel (no inter-dependencies)
- **After US1**: US2, US6 can start in parallel
- **After US4**: US7, US8 can start in parallel

#### Admin & Security (Phase 12-13)
- All admin endpoints T243-T249 can run in parallel
- All admin components T251-T255 can run in parallel
- All security tasks T256-T261 can run in parallel
- All performance tasks T262-T266 can run in parallel
- All monitoring tasks T267-T272 can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Générer les entités SeaORM depuis le schéma PG existant (26 tables) :
sea-orm-cli generate entity -u "$IMMOG_DATABASE_URL" -o rust-backend/src/db/entities

# Appliquer les migrations baseline :
cargo run --bin immog-migrate -- up

# Développer plusieurs modules en parallèle (fichiers différents) :
Task: "Install and configure oxide-auth in rust-backend/src/auth/oauth2.rs"
Task: "Create Elasticsearch client in rust-backend/src/services/search.rs"
# (services différents, configurables simultanément)
```

---

## Implementation Strategy

### MVP First (User Stories 1-4 Only)

1. Complete Phase 1: Setup with Rust/Axum crate + Next.js 16 + Elasticsearch + PostGIS + Vault
2. Complete Phase 2: Foundational with oxide-auth/JWT, RBAC natif, SeaORM, Elasticsearch, PostGIS, Varnish (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Listings with Elasticsearch search and React Leaflet maps)
4. Complete Phase 4: User Story 2 (Contracts with headless-chrome PDF)
5. Complete Phase 5: User Story 3 (Signatures)
6. Complete Phase 6: User Story 4 (Payments)
7. **STOP and VALIDATE**: Test full transaction flow (unit + intégration) indépendamment
8. Deploy/demo MVP

**MVP Validation Checklist**:
- [ ] User can register with OTP SMS and receive JWT token
- [ ] User can publish listing with photos optimized by `image`/`imageproc`
- [ ] Searcher can find listings via Elasticsearch without authentication
- [ ] Listings display on React Leaflet interactive map
- [ ] Parties can generate contract compliant with loi 2016/037 using headless-chrome
- [ ] Parties can sign contract electronically via OTP SMS
- [ ] Tenant can pay caution + commission via Orange/MTN
- [ ] Commission is collected before caution transfer
- [ ] Quittance PDF is generated automatically (headless-chrome)
- [ ] Suites de tests vertes (unit + intégration axum-test) sur chaque domaine avant mise en ligne

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (Axum, oxide-auth/JWT, SeaORM, Elasticsearch, PostGIS, Vault, Varnish)
2. Add User Story 1 → Test → Deploy/Demo (Browse & publish with Elasticsearch!)
3. Add User Story 2 → Test → Deploy/Demo (Contracts with headless-chrome!)
4. Add User Story 3 → Test → Deploy/Demo (E-signatures!)
5. Add User Story 4 → Test strict → Deploy/Demo (Payments! 🎯 **FULL MVP**)
6. Add User Story 5 → Test → Deploy/Demo (Certification with RBAC natif!)
7. Add User Story 6 → Test → Deploy/Demo (Messaging with Axum WebSocket!)
8. Add User Story 7 → Test → Deploy/Demo (Ratings!)
9. Add User Stories 8-9 (Phase 2 features) → Deploy
10. Add Admin Panel with RBAC natif → Deploy
11. Polish & Optimize → Production ready

### Parallel Team Strategy

With 5 developers after Foundational phase:

1. **Team completes Setup + Foundational together** (T001-T077) - Axum, oxide-auth/JWT, SeaORM, Elasticsearch, PostGIS, RBAC natif
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Listings with Elasticsearch) - T078-T111
   - **Developer B**: User Story 5 (Certification with RBAC natif) - T169-T181
   - **Developer C**: Admin Panel (Phase 12 with RBAC natif) - T243-T255
   - **Developer D**: DevOps & Infrastructure (Docker Swarm, CapRover, Vault) - T276-T289
   - **Developer E**: Security & Monitoring (tracing/Sentry) - T256-T275
3. After US1 completes:
   - **Developer A**: User Story 2 (Contracts with headless-chrome) - T112-T130
   - **Developer B**: User Story 6 (Messaging with Axum WebSocket) - T182-T200
4. After US2 completes:
   - **Developer A**: User Story 3 (Signatures) - T131-T145
5. After US3 completes:
   - **Developer A**: User Story 4 (Payments) - T146-T168
6. After US4 completes:
   - **Developer A**: User Story 7 (Ratings) - T201-T220
   - **Developer B**: User Story 8 (Insurance) - T221-T231
7. Stories complete and integrate independently

---

## Notes

- **[P]** tasks = different files, no dependencies, can run in parallel
- **[Story]** label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Total Tasks**: ~331 tasks organized across 15 phases (incl. US10 Visites : T022a, T033a, T200a-h)
- **Estimated Timeline**:
  - MVP Rust (US1-US4): 10-14 weeks with 3-5 developers
  - Full Platform Rust (US1-US9 + Admin): 18-26 weeks with 3-5 developers
- **Tech Stack Updates**:
  - **Rust 1.85+ (Axum + Tokio, édition 2024)** with **oxide-auth + jsonwebtoken** (OAuth2 + JWT, secret via Vault)
  - **SeaORM / SQLx** for ORM + compile-time checked queries (remplace Eloquent)
  - **Elasticsearch** via crate `elasticsearch` for advanced search (remplace Scout)
  - **PostgreSQL + PostGIS** for geospatial support
  - **Redis 7+** (deadpool-redis) for cache, sessions, queues (apalis), and broadcasting
  - **Varnish** for HTTP caching
  - **RBAC natif** for role-based access control (remplace Spatie Permission)
  - **image / imageproc** for photo optimization (remplace Laravel Image + Imageoptim)
  - **headless-chrome** for HTML→PDF (remplace Laravel PDF/DomPDF)
  - **Vault** for secrets (KV) + crypto (Transit) (remplace Docker Secrets)
  - **React Leaflet** for interactive maps
  - **Docker Swarm + CapRover** deployment options
- **Success Criteria**: All 20 SC metrics (SC-001 to SC-020) must pass before production deployment
- **Mise en production**: par domaine, dès que ses tests sont verts (première mise en ligne du backend Rust). Aucune mise en prod sans le mot `deploy`.

---

**End of Tasks**
