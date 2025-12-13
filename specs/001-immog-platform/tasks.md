# Tasks: ImmoGuinée Platform

**Input**: Design documents from `/specs/001-immog-platform/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Architecture**: Laravel 12 Backend + Next.js 16 Frontend (Decoupled API-First)
**Target**: 9 User Stories (US1-US9), 98 Functional Requirements, 20 Success Criteria
**Tech Stack**: Laravel 12, Laravel Passport (OAuth2), Elasticsearch, PostgreSQL+PostGIS, Redis 7+, Varnish, React Leaflet

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/` (Laravel 12 API - PHP 8.2+)
- **Frontend**: `frontend/` (Next.js 16 PWA - TypeScript 5+)
- **Infrastructure**: `docker/`, `n8n/`, `monitoring/`

**Note**: This tasks.md reflects the **Laravel 12 + Next.js 16** stack with:
- **Laravel Passport** (OAuth2 server, replacing Sanctum)
- **Elasticsearch** (advanced search with Laravel Scout, replacing Meilisearch)
- **PostgreSQL + PostGIS** (geospatial support)
- **Redis 7+** (cache, sessions, queues, broadcasting)
- **Varnish** (HTTP cache layer)
- **Spatie Permission** (role-based access control)
- **Laravel Image + Imageoptim** (photo optimization)
- **Geocoder** (geolocation services)
- **React Leaflet** (interactive maps)
- **Docker Swarm + CapRover** (deployment options)
**Intelligence Artificielle:**
- Ollama


**Monitoring:**
- Laravel Telescope
- Prometheus
- Grafana
- Sentry
- Logrocket
- OSSEC
**Backend & API:**
- Laravel Socialite
- Laravel PDF
- Laravel Queue
- Laravel Notifications
- laravel CRUD
- Laravel Spatia permission
- lravel Scout
- Lravel user-verification
- laravel two-factor-auth
- laravel Brute-force
- laravel cache
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
- Laravel Echo (intégration backend)
---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Laravel 12 project structure at backend/ with Laravel Sail (Docker)
- [x] T002 [P] Initialize Next.js 16 project structure at frontend/ with TypeScript, TailwindCSS, PWA plugin, React Leaflet
- [x] T003 [P] Configure Docker Compose multi-service stack in docker/docker-compose.yml (PostgreSQL+PostGIS, Redis, Elasticsearch, Varnish, MinIO, n8n, WAHA, Laravel Echo) - 18 services including queue-worker and scheduler
- [x] T004 [P] Setup environment configuration files: backend/.env.example, frontend/.env.example with all required variables
- [x] T005 [P] Configure ESLint + Prettier for frontend in frontend/.eslintrc.json and frontend/.prettierrc
- [x] T006 [P] Configure PHP CS Fixer for backend in backend/.php-cs-fixer.php
- [x] T007 Setup Traefik reverse proxy in docker/traefik/ with auto-SSL configuration
- [x] T008 [P] Create GitHub Actions workflows in .github/workflows/ci.yml for automated testing
- [x] T009 [P] Setup monitoring stack: monitoring/grafana/, monitoring/prometheus/ with initial dashboards

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & ORM

- [x] T010 Create PostgreSQL enums migration in backend/database/migrations/2025_01_28_000001_create_enums.php (12 enums: badge, type_compte, statut_verification, etc.)
- [x] T011 Enable PostGIS extension in backend/database/migrations/2025_01_28_000002_enable_postgis.php for geospatial support
- [x] T012 Create users table migration in backend/database/migrations/2025_01_28_000003_create_users_table.php with UUID primary key
- [x] T013 Create listings table migration in backend/database/migrations/2025_01_28_000004_create_listings_table.php with indexes and PostGIS geometry columns
- [x] T014 Create contracts table migration in backend/database/migrations/2025_01_28_000005_create_contracts_table.php
- [x] T015 Create payments table migration in backend/database/migrations/2025_01_28_000006_create_payments_table.php
- [x] T016 [P] Create certification_documents table migration in backend/database/migrations/2025_01_28_000007_create_certification_documents_table.php
- [x] T017 [P] Create conversations table migration in backend/database/migrations/2025_01_28_000008_create_conversations_table.php
- [x] T018 [P] Create messages table migration in backend/database/migrations/2025_01_28_000009_create_messages_table.php
- [x] T019 [P] Create disputes table migration in backend/database/migrations/2025_01_28_000010_create_disputes_table.php
- [x] T020 [P] Create transactions table migration in backend/database/migrations/2025_01_28_000011_create_transactions_table.php
- [x] T021 [P] Create ratings table migration in backend/database/migrations/2025_01_28_000012_create_ratings_table.php
- [x] T022 [P] Create insurances table migration in backend/database/migrations/2025_01_28_000013_create_insurances_table.php (Phase 2 only)

### Eloquent Models

- [x] T023 Create User Eloquent model in backend/app/Models/User.php with HasApiTokens, HasRoles (Spatie), HasUuids traits, relationships, scopes
- [x] T024 [P] Create Listing Eloquent model in backend/app/Models/Listing.php with Searchable trait for Elasticsearch (Laravel Scout)
- [x] T025 [P] Create Contract Eloquent model in backend/app/Models/Contract.php with JSON casts
- [x] T026 [P] Create Payment Eloquent model in backend/app/Models/Payment.php with accessors/mutators
- [x] T027 [P] Create CertificationDocument model in backend/app/Models/CertificationDocument.php
- [x] T028 [P] Create Conversation model in backend/app/Models/Conversation.php
- [x] T029 [P] Create Message model in backend/app/Models/Message.php with Broadcasting events
- [x] T030 [P] Create Dispute model in backend/app/Models/Dispute.php
- [x] T031 [P] Create Transaction model in backend/app/Models/Transaction.php
- [x] T032 [P] Create Rating model in backend/app/Models/Rating.php
- [x] T033 [P] Create Insurance model in backend/app/Models/Insurance.php

### Authentication & Authorization

- [x] T034 Install and configure Laravel Passport (OAuth2 server) in backend/config/passport.php with personal access tokens
- [x] T035 Run Laravel Passport migrations and install encryption keys with php artisan passport:install
- [x] T036 Create authentication middleware in backend/app/Http/Middleware/Authenticate.php
- [x] T037 [P] Install and configure Spatie Permission in backend/config/permission.php for role-based access control
- [x] T038 [P] Create role-based middleware in backend/app/Http/Middleware/CheckAdmin.php using Spatie Permission
- [x] T039 [P] Create OTP service in backend/app/Services/OtpService.php with Redis storage and Twilio SMS integration
- [x] T040 [P] Configure Laravel Two-factor-auth package in backend/config/two-factor.php
- [x] T041 [P] Configure Laravel Brute-force protection middleware in backend/app/Http/Middleware/ThrottleRequests.php
- [x] T042 Configure CORS in backend/config/cors.php for frontend domain

### Laravel Services & Repositories

- [x] T043 Create UserRepository in backend/app/Repositories/UserRepository.php
- [x] T044 [P] Create ListingRepository in backend/app/Repositories/ListingRepository.php
- [x] T045 [P] Create ContractRepository in backend/app/Repositories/ContractRepository.php
- [x] T046 [P] Create PaymentRepository in backend/app/Repositories/PaymentRepository.php
- [x] T047 [P] Create MessageRepository in backend/app/Repositories/MessageRepository.php

### External Integrations

- [x] T048 Create Twilio SMS client in backend/app/Services/SmsService.php (FR-061 Canal 3)
- [x] T049 [P] Create WAHA WhatsApp client in backend/app/Services/WhatsAppService.php (FR-061 Canal 2)
- [x] T050 [P] Create email service with Laravel Notifications in backend/app/Notifications/
- [x] T051 Create Orange Money API client in backend/app/Services/OrangeMoneyService.php (FR-039)
- [x] T052 [P] Create MTN Mobile Money API client in backend/app/Services/MtnMomoService.php (FR-039)
- [x] T053 Create MinIO/S3 storage client config in backend/config/filesystems.php
- [x] T054 Create Elasticsearch client config in backend/config/scout.php with Laravel Scout
- [x] T055 [P] Install and configure Laravel Image + Imageoptim in backend/config/image.php for photo optimization
- [x] T056 [P] Install and configure Geocoder in backend/config/geocoder.php for geolocation with PostGIS
- [x] T057 [P] Configure Varnish HTTP cache in docker/varnish/default.vcl for static asset caching
- [x] T057a [P] Configure Redis 7+ for cache in backend/config/cache.php with Redis driver (FR-095)
- [x] T057b [P] Configure Redis 7+ for sessions in backend/config/session.php with Redis driver
- [x] T057c [P] Configure Redis 7+ for queues in backend/config/queue.php with Redis driver (async jobs)
- [x] T057d [P] Configure Redis 7+ for rate limiting in backend/config/cache.php with Redis limiter

### Laravel Broadcasting

- [x] T058 Configure Laravel Echo Server with Socket.IO and Redis broadcaster in backend/config/broadcasting.php
- [x] T059 [P] Create NewMessageEvent broadcast event in backend/app/Events/NewMessageEvent.php
- [x] T060 [P] Create PaymentStatusUpdated broadcast event in backend/app/Events/PaymentStatusUpdated.php
- [x] T061 [P] Create ContractStatusUpdated broadcast event in backend/app/Events/ContractStatusUpdated.php

### Frontend Core

- [x] T062 Setup Next.js 16 App Router structure in frontend/app/
- [x] T063 [P] Configure TailwindCSS 3 in frontend/tailwind.config.ts with mobile-first breakpoints
- [x] T064 [P] Setup React Query (TanStack Query v5) provider in frontend/app/providers.tsx
- [x] T065 Configure PWA manifest in frontend/public/manifest.json
- [x] T066 Create authentication context in frontend/lib/auth/AuthContext.tsx with Laravel Passport token management
- [x] T067 [P] Create API client utilities in frontend/lib/api/client.ts with axios and Passport OAuth2 tokens
- [x] T068 [P] Create Laravel Echo client setup in frontend/lib/socket/echo.ts
- [x] T069 [P] Install and configure React Leaflet in frontend/lib/maps/leaflet-config.ts for interactive maps
- [x] T070 Install and configure shadcn/ui base components in frontend/components/ui/

### Error Handling & Validation

- [x] T071 Create global exception handler in backend/app/Exceptions/Handler.php with consistent JSON error format
- [x] T072 [P] Create validation request classes in backend/app/Http/Requests/ for each endpoint
- [x] T073 [P] Create input sanitization utilities in backend/app/Helpers/SanitizeHelper.php (FR-089)
- [x] T074 Create error boundary component in frontend/components/ErrorBoundary.tsx

### Seeding & Testing Data

- [x] T075 Create UserFactory in backend/database/factories/UserFactory.php
- [x] T076 [P] Create ListingFactory in backend/database/factories/ListingFactory.php
- [x] T077 Create DatabaseSeeder in backend/database/seeders/DatabaseSeeder.php with test users and quartiers

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Publication Gratuite d'Annonces en 5 Minutes (Priority: P1) 🎯 MVP

**Goal**: Un propriétaire peut publier gratuitement une annonce immobilière en moins de 5 minutes avec 10 photos max, description, prix, caution, géolocalisation par quartier. Les chercheurs peuvent consulter les annonces et utiliser des filtres avancés sans créer de compte.

**Independent Test**: Un propriétaire crée un compte avec OTP SMS, publie une annonce d'appartement 2 chambres à Kaloum avec 5 photos, prix 2 500 000 GNF/mois, caution 3 mois, et vérifie qu'elle apparaît immédiatement dans les résultats de recherche Elasticsearch.

### Backend - Authentication (FR-001 to FR-005)

- [x] T078 [P] [US1] Create POST /api/auth/register endpoint in backend/routes/api.php and backend/app/Http/Controllers/Api/AuthController.php::register() with Laravel Passport token generation (FR-001 OTP SMS)
- [x] T079 [P] [US1] Create POST /api/auth/otp/verify endpoint in AuthController.php::verifyOtp() (FR-001 OTP validation)
- [x] T080 [P] [US1] Create POST /api/auth/login endpoint in AuthController.php::login() with Laravel Passport token response (FR-003 phone + password)
- [x] T081 [P] [US1] Create POST /api/auth/logout endpoint in AuthController.php::logout() with Passport token revocation
- [x] T082 [P] [US1] Create GET /api/auth/me endpoint in AuthController.php::me() to fetch authenticated user
- [x] T083 [P] [US1] Create PATCH /api/auth/me endpoint in AuthController.php::updateProfile() (FR-005 notification preferences)

### Backend - Listings CRUD (FR-006 to FR-015)

- [x] T084 [US1] Create POST /api/listings endpoint in backend/app/Http/Controllers/Api/ListingController.php::store() with photo upload to MinIO and geolocation via Geocoder (FR-006, FR-009)
- [x] T085 [US1] Create OptimizeListingPhotosJob queue job in backend/app/Jobs/OptimizeListingPhotosJob.php using Laravel Image + Imageoptim (FR-010 WebP conversion)
- [x] T086 [P] [US1] Create GET /api/listings/{id} endpoint in ListingController.php::show() with view counter increment
- [x] T087 [P] [US1] Create PATCH /api/listings/{id} endpoint in ListingController.php::update() (FR-013 title/description/photos only)
- [x] T088 [P] [US1] Create DELETE /api/listings/{id} endpoint in ListingController.php::destroy() with soft delete
- [x] T089 [US1] Create CheckExpiredListingsCommand Artisan command in backend/app/Console/Commands/CheckExpiredListingsCommand.php (FR-014 auto-expire after 90 days)
- [x] T090 [P] [US1] Create POST /api/listings/{id}/premium endpoint in ListingController.php::applyPremium() for badge URGENT, remontée 48h, photos pro (FR-015)

### Backend - Search & Filters with Elasticsearch (FR-016 to FR-021)

- [x] T091 [US1] Create GET /api/listings/search endpoint in ListingController.php::search() with Elasticsearch integration (FR-017 7 filters, FR-018 5 sort options)
- [x] T092 [US1] Configure Elasticsearch indexes in backend/config/scout.php with searchable attributes, filterable attributes, ranking rules (FR-094 <500ms)
- [x] T093 [US1] Create IndexListingsInElasticsearch Artisan command in backend/app/Console/Commands/IndexListingsInElasticsearch.php
- [x] T094 [P] [US1] Configure Elasticsearch mappings in backend/config/elasticsearch-mappings.json with geospatial queries for PostGIS coordinates

### Frontend - Authentication UI

- [x] T095 [P] [US1] Create registration page in frontend/app/(public)/auth/register/page.tsx with phone input and OTP modal
- [x] T096 [P] [US1] Create login page in frontend/app/(public)/auth/login/page.tsx
- [x] T097 [P] [US1] Create OTP verification component in frontend/components/auth/OtpVerification.tsx with resend button (FR-001)
- [x] T098 [US1] Implement useAuth hook in frontend/lib/auth/useAuth.ts with React Query and Laravel Passport token management

### Frontend - Listing Publication UI

- [x] T099 [US1] Create listing publication page in frontend/app/(auth)/publier/page.tsx with 5-minute timer visible (FR-006)
- [x] T100 [US1] Create ListingForm component in frontend/components/listings/ListingForm.tsx with validation (FR-011 mandatory fields)
- [x] T101 [US1] Create PhotoUploader component in frontend/components/listings/PhotoUploader.tsx with drag-and-drop, 10 photos max (FR-009)
- [x] T102 [P] [US1] Create QuartierSelector component with React Leaflet map in frontend/components/listings/QuartierSelector.tsx (FR-008 predefined quartiers)
- [x] T103 [P] [US1] Create TypeBienSelector component in frontend/components/listings/TypeBienSelector.tsx (FR-007 7 types)

### Frontend - Search & Browse UI

- [x] T104 [US1] Create homepage in frontend/app/(public)/page.tsx with latest 20 listings and search bar
- [x] T105 [US1] Create search page in frontend/app/(public)/annonces/page.tsx with filters and pagination
- [x] T106 [US1] Create SearchFilters component in frontend/components/listings/SearchFilters.tsx (FR-017 7 filters)
- [x] T107 [US1] Create ListingCard component in frontend/components/listings/ListingCard.tsx (FR-021 thumbnail, price, quartier, badge)
- [x] T108 [US1] Create listing detail page with React Leaflet map in frontend/app/(public)/annonces/[id]/page.tsx with photo gallery and contact button
- [x] T109 [US1] Implement useListings hook in frontend/lib/hooks/useListings.ts with React Query pagination and Elasticsearch results

### Testing & Validation

- [ ] T110 [US1] Write PHPUnit feature test for listing publication flow in backend/tests/Feature/ListingPublicationTest.php
- [ ] T111 [US1] Write Playwright E2E test for User Story 1 in frontend/tests/e2e/user-story-1-publish-listing.spec.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - users can register with Laravel Passport, publish listings with photos optimized by Laravel Image, and searchers can browse/filter listings via Elasticsearch without authentication.

---

## Phase 4: User Story 2 - Génération Automatique de Contrats (Priority: P2)

**Goal**: Après accord verbal, la plateforme génère automatiquement un contrat de location conforme à la loi guinéenne 2016/037 via un formulaire guidé. Le contrat inclut toutes les clauses obligatoires et peut être prévisualisé avant envoi pour signature.

**Independent Test**: Un propriétaire et un locataire sont d'accord sur une location. Le propriétaire initie la génération d'un contrat de location résidentiel, remplit le formulaire en 5 minutes, prévisualise le PDF généré avec toutes les clauses, et l'envoie au locataire pour signature.

### Backend - Contract Generation (FR-022 to FR-027)

- [x] T112 [US2] Install and configure Laravel PDF (DomPDF or Snappy) in backend/config/pdf.php
- [x] T113 [US2] Create POST /api/contracts/generate endpoint in backend/app/Http/Controllers/Api/ContractController.php::generate() (FR-023 3-step form)
- [x] T114 [US2] Create ContractService in backend/app/Services/ContractService.php with PDF generation logic (FR-024 professional PDF)
- [x] T115 [P] [US2] Create Blade template for bail_location_residentiel in backend/resources/views/contracts/bail-location-residentiel.blade.php (FR-024 conformité loi 2016/037)
- [x] T116 [P] [US2] Create Blade template for bail_location_commercial in backend/resources/views/contracts/bail-location-commercial.blade.php
- [x] T117 [P] [US2] Create Blade template for promesse_vente_terrain in backend/resources/views/contracts/promesse-vente-terrain.blade.php
- [x] T118 [P] [US2] Create Blade template for mandat_gestion in backend/resources/views/contracts/mandat-gestion.blade.php
- [x] T119 [P] [US2] Create Blade template for attestation_caution in backend/resources/views/contracts/attestation-caution.blade.php
- [x] T120 [US2] Create GET /api/contracts/{id}/preview endpoint in ContractController.php::preview() with PDF streaming (FR-025)
- [x] T121 [P] [US2] Create DELETE /api/contracts/{id} endpoint in ContractController.php::destroy() (FR-026 only if not signed)
- [x] T122 [US2] Create POST /api/contracts/{id}/send endpoint in ContractController.php::send() with multi-channel notifications (FR-027 SMS, Email, Push, WhatsApp)

### Frontend - Contract Generation UI

- [x] T123 [US2] Create contract generation page in frontend/app/(auth)/contrats/generer/page.tsx with listing selector
- [x] T124 [US2] Create ContractForm component in frontend/components/contracts/ContractForm.tsx with 3-step wizard (FR-023)
- [x] T125 [US2] Create PDFPreview component in frontend/components/contracts/PDFPreview.tsx with zoom controls (FR-025 50%-200%)
- [x] T126 [US2] Create ContractTypeSelector component in frontend/components/contracts/ContractTypeSelector.tsx (FR-022 5 types)
- [x] T127 [US2] Implement useContracts hook in frontend/lib/hooks/useContracts.ts with React Query

### n8n Workflows

- [x] T128 [P] [US2] Create n8n workflow for contract sent notifications in n8n/workflows/signature-contrat-pdf.json (SMS, Email, Push, WhatsApp)

### Testing & Validation

- [x] T129 [US2] Write PHPUnit feature test for contract generation in backend/tests/Feature/ContractGenerationTest.php (verify PDF structure, clauses)
- [x] T130 [US2] Write Playwright E2E test for User Story 2 in frontend/tests/e2e/user-story-2-generate-contract.spec.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - contracts can be generated with Laravel PDF and previewed.

---

## Phase 5: User Story 3 - Signature Électronique OTP SMS (Priority: P3)

**Goal**: Les deux parties signent électroniquement le contrat via OTP SMS. Chaque signature est horodatée et un cachet électronique est apposé. Une fois toutes les signatures complètes, le contrat devient immutable et est archivé de manière sécurisée (chiffrement AES-256) pendant 10 ans minimum.

**Independent Test**: Un locataire reçoit un contrat à signer. Il consulte le contrat, clique sur "Signer", reçoit un OTP SMS, le saisit, et sa signature avec horodatage est ajoutée au PDF. Le propriétaire signe ensuite. Le contrat devient immutable et les deux parties reçoivent une copie par email.

### Backend - Electronic Signatures (FR-028 to FR-033)

- [x] T131 [US3] Create POST /api/contracts/{id}/sign endpoint in backend/app/Http/Controllers/Api/ContractController.php::sign() with OTP validation (FR-028)
- [x] T132 [US3] Create SignatureService in backend/app/Services/SignatureService.php with SHA-256 hash generation (FR-030)
- [x] T133 [US3] Implement signature watermark addition to PDF in ContractService.php (FR-030 cachet électronique)
- [x] T134 [US3] Create LockSignedContractJob queue job in backend/app/Jobs/LockSignedContractJob.php to make PDF immutable (FR-032)
- [x] T135 [US3] Create CheckRetractionPeriodCommand Artisan command in backend/app/Console/Commands/CheckRetractionPeriodCommand.php (FR-033 48h countdown)

### Backend - Document Archival (FR-034 to FR-038)

- [x] T136 [US3] Implement AES-256 encryption for signed PDFs in backend/app/Services/EncryptionService.php (FR-034)
- [x] T137 [US3] Create GET /api/contracts/{id}/download endpoint in ContractController.php::download() with watermark "Téléchargé par [Nom] le [Date]" (FR-036)
- [x] T138 [US3] Create BackupSignedContractsCommand Artisan command in backend/app/Console/Commands/BackupSignedContractsCommand.php (FR-038 daily 2h GMT)
- [x] T139 [P] [US3] Create POST /api/contracts/{id}/cancel endpoint (FR-033 during 48h retraction period)

### Frontend - Signature UI

- [x] T140 [US3] Create contract signature page in frontend/app/(auth)/contrats/[id]/signer/page.tsx
- [x] T141 [US3] Create SignatureModal component in frontend/components/contracts/SignatureModal.tsx with OTP input (FR-028 4-step process)
- [x] T142 [US3] Create RetractionCountdown component in frontend/components/contracts/RetractionCountdown.tsx (FR-033 48h timer)
- [x] T143 [US3] Create signed contracts list page in frontend/app/(auth)/dashboard/mes-contrats/page.tsx with download links

### Testing & Validation

- [x] T144 [US3] Write PHPUnit feature test for signature flow in backend/tests/Feature/ContractSignatureTest.php (OTP validation, hash integrity)
- [x] T145 [US3] Write Playwright E2E test for User Story 3 in frontend/e2e/contract-signature.spec.ts

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - contracts can be signed electronically and archived securely.

---

## Phase 6: User Story 4 - Paiement Commission 50% Loyer le Jour de la Caution (Priority: P4)

**Goal**: Après signature du contrat, le locataire paie la caution (1-6 mois de loyer) + l'avance + la commission plateforme (50% d'un mois de loyer) via Orange Money ou MTN Mobile Money. Le paiement de la commission est obligatoire le même jour que la caution. La commission est collectée par la plateforme AVANT que l'argent de la caution ne soit transféré au propriétaire.

**Independent Test**: Un contrat de bail est signé (loyer 2 500 000 GNF/mois, caution 1 mois, avance 3 mois = 7 500 000 GNF). Le locataire accède à son dashboard "Mes paiements", voit une facture de 11 250 000 GNF (7 500 000 avance + 2 500 000 caution + 1 250 000 commission), paie via Orange Money avec 2FA, l'argent est placé en escrow, la commission est prélevée par la plateforme, et le propriétaire reçoit 10 000 000 GNF après validation.

### Backend - Payments & Escrow (FR-039 to FR-052)

- [x] T146 [US4] Create CommissionCalculatorService in backend/app/Services/CommissionCalculatorService.php (FR-040 50% location, 1% vente terrain, 2% vente maison)
- [x] T147 [US4] Create POST /api/payments/initiate endpoint in backend/app/Http/Controllers/Api/PaymentController.php::initiate() (FR-043 step 1-3)
- [x] T148 [US4] Create EscrowService in backend/app/Services/EscrowService.php with 48h timeout logic (FR-044)
- [x] T149 [P] [US4] Create POST /api/payments/webhooks/orange endpoint in backend/app/Http/Controllers/Api/WebhookController.php::orangeMoney() (FR-043 step 4 webhook)
- [x] T150 [P] [US4] Create POST /api/payments/webhooks/mtn endpoint in WebhookController.php::mtnMomo() (FR-043 step 4 webhook)
- [x] T151 [US4] Create ProcessPaymentConfirmationJob queue job in backend/app/Jobs/ProcessPaymentConfirmationJob.php (FR-043 step 5-7)
- [x] T152 [US4] Create POST /api/payments/{id}/validate endpoint in PaymentController.php::validateByLandlord() (FR-044 landlord confirmation)
- [x] T153 [US4] Create CheckEscrowTimeoutsCommand Artisan command in backend/app/Console/Commands/CheckEscrowTimeoutsCommand.php (FR-044 48h auto-release)
- [x] T154 [US4] Create QuittanceService in backend/app/Services/QuittanceService.php with PDF generation (FR-046)
- [x] T155 [P] [US4] Create Blade template for quittance in backend/resources/views/payments/quittance.blade.php
- [x] T156 [US4] Create GET /api/payments endpoint in PaymentController.php::index() with filters (FR-048 history table)
- [x] T157 [P] [US4] Create POST /api/payments/{id}/refund endpoint in PaymentController.php::refund() (FR-049 dispute refund)
- [x] T158 [P] [US4] Create POST /api/payments/cash endpoint in PaymentController.php::cashPayment() (FR-052 fallback)

### Frontend - Payments UI

- [x] T159 [US4] Create payments dashboard page in frontend/app/(auth)/dashboard/mes-paiements/page.tsx (FR-048)
- [x] T160 [US4] Create InvoiceDetail component in frontend/components/payments/InvoiceDetail.tsx (FR-041 facture with 3 sections)
- [x] T161 [US4] Create PaymentForm component in frontend/components/payments/PaymentForm.tsx (Orange/MTN selector, 2FA OTP)
- [x] T162 [US4] Create PaymentHistory component in frontend/components/payments/PaymentHistory.tsx with filters and CSV export (FR-048)
- [x] T163 [US4] Create TransparencyWarning component in frontend/components/payments/TransparencyWarning.tsx (FR-042 commission non-refundable)
- [x] T164 [US4] Implement usePayments hook in frontend/lib/hooks/usePayments.ts with React Query

### n8n Workflows

- [x] T165 [P] [US4] Create n8n workflow for payment confirmation notifications in n8n/workflows/paiement-quittance.json
- [x] T166 [P] [US4] Create n8n workflow for escrow timeout checks in n8n/workflows/escrow-timeout.json (cron every 1h)

### Testing & Validation

- [x] T167 [US4] Write PHPUnit feature test for payment flow in backend/tests/Feature/PaymentFlowTest.php (commission calculation, escrow, webhooks)
- [x] T168 [US4] Write Playwright E2E test for User Story 4 in frontend/e2e/user-story-4-payment-commission.spec.ts

**Checkpoint**: At this point, User Stories 1-4 should all work independently - full transaction flow from listing to payment is functional.

---

## Phase 7: User Story 5 - Programme de Certification (Bronze/Argent/Or/Diamant) (Priority: P5)

**Goal**: Les utilisateurs progressent dans un programme de certification en 4 niveaux basé sur le nombre de transactions complétées, la vérification de documents et l'absence de litiges. Chaque niveau débloque des avantages (badge visible, priorité messagerie, réduction commissions).

**Independent Test**: Un propriétaire s'inscrit (statut Bronze), complète sa vérification CNI + titre foncier (passe Argent), complète 5 transactions sans litige (passe Or), atteint 20 transactions avec note moyenne 4.8/5 (passe Diamant). Son badge Diamant s'affiche sur toutes ses annonces.

### Backend - Certification (FR-053 to FR-058)

- [x] T169 [US5] Create CertificationService in backend/app/Services/CertificationService.php with badge upgrade/downgrade logic using Spatie Permission roles (FR-053)
- [x] T170 [US5] Create POST /api/certifications/upload endpoint in backend/app/Http/Controllers/Api/CertificationController.php::upload() (FR-054 CNI, titre foncier)
- [x] T171 [US5] Create POST /api/certifications/{id}/verify endpoint in CertificationController.php::verify() with Spatie Permission admin check (FR-054)
- [x] T172 [US5] Create GET /api/certifications/me endpoint in CertificationController.php::my() (FR-057 dashboard progression)
- [x] T173 [US5] Create CheckBadgeUpgradesCommand Artisan command in backend/app/Console/Commands/CheckBadgeUpgradesCommand.php (FR-053 auto-upgrade)
- [x] T174 [US5] Create CheckBadgeDowngradesCommand Artisan command in backend/app/Console/Commands/CheckBadgeDowngradesCommand.php (FR-058 auto-downgrade)

### Frontend - Certification UI

- [x] T175 [US5] Create certification page in frontend/app/(auth)/dashboard/certification/page.tsx (FR-057 dashboard)
- [x] T176 [US5] Create BadgeDisplay component in frontend/components/certifications/BadgeDisplay.tsx (FR-055 visible on profile, listings, messages)
- [x] T177 [US5] Create ProgressTracker component in frontend/components/certifications/ProgressTracker.tsx (FR-057 progress bar)
- [x] T178 [US5] Create DocumentUploader component in frontend/components/certifications/DocumentUploader.tsx (FR-054 CNI/titre foncier)
- [x] T179 [US5] Implement useCertification hook in frontend/lib/hooks/useCertification.ts

### Testing & Validation

- [x] T180 [US5] Write PHPUnit feature test for certification flow in backend/tests/Feature/CertificationTest.php (badge upgrades with Spatie Permission, downgrades)
- [x] T181 [US5] Write Playwright E2E test for User Story 5 in frontend/e2e/user-story-5-certification.spec.ts

**Checkpoint**: Certification program is functional with automatic badge progression via Spatie Permission roles.

---

## Phase 8: User Story 6 - Messagerie Sécurisée avec Notifications Multicanales (Priority: P6)

**Goal**: Les chercheurs et propriétaires communiquent via une messagerie interne (texte + vocal) sans révéler leurs numéros de téléphone. Les notifications sont envoyées via 4 canaux : Push app, SMS, Email, WhatsApp (opt-in). Les messages sont conservés avec horodatage et statut de lecture.

**Independent Test**: Un chercheur envoie un message "Bonjour, le bien est-il toujours disponible ?" au propriétaire. Le propriétaire (qui a activé WhatsApp) reçoit 4 notifications simultanées (Push, SMS, Email, WhatsApp), répond "Oui, disponible dès le 1er février", et le chercheur voit la réponse en temps réel avec statut "Lu à 14:35".

### Backend - Messaging (FR-059 to FR-066)

- [x] T182 [US6] Create POST /api/messaging/{id}/messages endpoint in backend/app/Http/Controllers/Api/MessagingController.php::sendMessage() (FR-059)
- [x] T183 [US6] Create GET /api/messaging/conversations endpoint in MessagingController.php::conversations() (FR-063)
- [x] T184 [US6] Create GET /api/messaging/{id}/messages endpoint in MessagingController.php::messages() with pagination (FR-063)
- [x] T185 [P] [US6] Create POST /api/messaging/{id}/report endpoint in MessagingController.php::reportMessage() (FR-064)
- [x] T186 [US6] Create MessageNotificationService in backend/app/Services/MessageNotificationService.php with 4-channel logic (FR-061)
- [x] T187 [US6] Create FraudDetectionService in backend/app/Services/FraudDetectionService.php (FR-065 keyword detection)
- [x] T188 [US6] Create RateLimitService in backend/app/Services/RateLimitService.php (FR-066 50 msg/h, 10 conv/day)

### Backend - Real-Time Events

- [x] T189 [P] [US6] Update NewMessageEvent in backend/app/Events/NewMessageEvent.php with broadcast to private channel
- [x] T190 [P] [US6] Update TypingIndicatorEvent in backend/app/Events/TypingIndicatorEvent.php
- [x] T191 [P] [US6] Update MessageReadEvent in backend/app/Events/MessageReadEvent.php

### Frontend - Messaging UI

- [x] T192 [US6] Create messaging page in frontend/app/(auth)/dashboard/messagerie/page.tsx
- [x] T193 [US6] Create ConversationList component in frontend/components/messaging/ConversationList.tsx
- [x] T194 [US6] Create MessageThread component in frontend/components/messaging/MessageThread.tsx with real-time updates
- [x] T195 [US6] Create MessageInput component in frontend/components/messaging/MessageInput.tsx (text, vocal, photo FR-059)
- [x] T196 [US6] Create PhoneMaskingDisplay component in frontend/components/messaging/PhoneMaskingDisplay.tsx (FR-060)
- [x] T197 [US6] Implement useMessaging hook in frontend/lib/hooks/useMessaging.ts with Laravel Echo listeners

### n8n Workflows

- [x] T198 [P] [US6] Create n8n workflow for message notifications in n8n/workflows/nouveau-message-alerts.json (4 channels)

### Testing & Validation

- [x] T199 [US6] Write PHPUnit feature test for messaging in backend/tests/Feature/MessagingTest.php (phone masking, notifications, anti-spam)
- [x] T200 [US6] Write Playwright E2E test for User Story 6 in frontend/e2e/user-story-6-messaging.spec.ts

**Checkpoint**: Real-time messaging with multi-channel notifications is functional via Laravel Echo + Socket.IO.

---

## Phase 9: User Story 7 - Système de Notation et Médiation de Litiges (Priority: P7)

**Goal**: Après une transaction complétée, les deux parties se notent mutuellement (1-5 étoiles) avec commentaire obligatoire. Les commentaires sont modérés automatiquement. En cas de litige, un système de médiation gratuite permet de résoudre à l'amiable dans un délai de 7 jours.

**Independent Test**: Un locataire et un propriétaire complètent une transaction. Le locataire note le propriétaire 5 étoiles "Très professionnel". Le propriétaire note le locataire 4 étoiles "Bon locataire mais retard paiement 1er mois". Les notes apparaissent sur leurs profils publics après modération automatique.

### Backend - Ratings (FR-067 to FR-071)

- [x] T201 [US7] Create POST /api/ratings endpoint in backend/app/Http/Controllers/Api/RatingController.php::store() (FR-067 mutual rating)
- [x] T202 [US7] Create GET /api/ratings/{userId} endpoint in RatingController.php::show() (FR-070 public profile ratings)
- [x] T203 [US7] Create ContentModerationService in backend/app/Services/ContentModerationService.php (FR-069 auto-moderation keywords)
- [x] T204 [US7] Create UpdateAverageRatingsCommand Artisan command in backend/app/Console/Commands/UpdateAverageRatingsCommand.php (FR-071)

### Backend - Disputes (FR-072 to FR-075)

- [x] T205 [US7] Create POST /api/disputes endpoint in backend/app/Http/Controllers/Api/DisputeController.php::store() (FR-072)
- [x] T206 [US7] Create GET /api/disputes endpoint in DisputeController.php::index() (user disputes list)
- [x] T207 [P] [US7] Create PATCH /api/disputes/{id}/assign endpoint in DisputeController.php::assignMediator() with Spatie Permission admin check (FR-073)
- [x] T208 [P] [US7] Create PATCH /api/disputes/{id}/resolve endpoint in DisputeController.php::resolve() (FR-074 3 issues)
- [x] T209 [US7] Create AssignMediatorCommand Artisan command in backend/app/Console/Commands/AssignMediatorCommand.php (FR-073 auto-assign within 48h)

### Frontend - Ratings UI

- [x] T210 [US7] Create rating submission page in frontend/app/(auth)/notations/[transactionId]/page.tsx
- [x] T211 [US7] Create RatingForm component in frontend/components/ratings/RatingForm.tsx (FR-067 3 criteria)
- [x] T212 [US7] Create RatingsDisplay component in frontend/components/ratings/RatingsDisplay.tsx (FR-070 on public profiles)
- [x] T213 [US7] Implement useRatings hook in frontend/lib/hooks/useRatings.ts

### Frontend - Disputes UI

- [x] T214 [US7] Create dispute creation page in frontend/app/(auth)/litiges/creer/page.tsx
- [x] T215 [US7] Create DisputeForm component in frontend/components/disputes/DisputeForm.tsx (FR-072 with file uploads)
- [x] T216 [US7] Create disputes list page in frontend/app/(auth)/dashboard/mes-litiges/page.tsx
- [x] T217 [US7] Implement useDisputes hook in frontend/lib/hooks/useDisputes.ts

### Testing & Validation

- [x] T218 [US7] Write PHPUnit feature test for ratings in backend/tests/Feature/RatingTest.php (moderation, average calculation)
- [x] T219 [US7] Write PHPUnit feature test for disputes in backend/tests/Feature/DisputeTest.php (mediator assignment with Spatie Permission, resolution)
- [x] T220 [US7] Write Playwright E2E test for User Story 7 in frontend/tests/e2e/user-story-7-ratings-disputes.spec.ts

**Checkpoint**: Rating and dispute mediation systems are functional.

---

## Phase 10: User Story 8 - Module Assurance Locative (Priority: P8 - Phase 2)

**Goal**: Les locataires peuvent souscrire à "SÉJOUR SEREIN" (2% du loyer mensuel) pour se protéger contre les expulsions abusives. Les propriétaires peuvent souscrire à "LOYER GARANTI" pour se protéger contre les impayés.

**Independent Test**: Un locataire souscrit à "SÉJOUR SEREIN" pour 50 000 GNF/mois (2% de 2 500 000 GNF). Après 6 mois, le propriétaire tente de l'expulser sans raison valable. Le locataire active l'assurance et reçoit 7 500 000 GNF en compensation.

### Backend - Insurance (FR-076 to FR-080)

- [x] T221 [US8] Create POST /api/insurances/subscribe endpoint in backend/app/Http/Controllers/Api/InsuranceController.php::subscribe() (FR-076)
- [x] T222 [US8] Create POST /api/insurances/{id}/claim endpoint in InsuranceController.php::claim() (FR-077, FR-078)
- [x] T223 [US8] Create GET /api/insurances/me endpoint in InsuranceController.php::my() (active policies)
- [x] T224 [US8] Create InsuranceCertificateService in backend/app/Services/InsuranceCertificateService.php (FR-080 PDF generation)
- [x] T225 [P] [US8] Create Blade template for insurance certificate in backend/resources/views/insurances/certificat.blade.php

### Frontend - Insurance UI

- [x] T226 [US8] Create insurance subscription page in frontend/app/(auth)/assurances/souscrire/page.tsx
- [x] T227 [US8] Create InsuranceOptions component in frontend/components/insurances/InsuranceOptions.tsx (SÉJOUR SEREIN, LOYER GARANTI)
- [x] T228 [US8] Create insurance claims page in frontend/app/(auth)/assurances/reclamations/page.tsx
- [x] T229 [US8] Implement useInsurances hook in frontend/lib/hooks/useInsurances.ts

### Testing & Validation

- [x] T230 [US8] Write PHPUnit feature test for insurance in backend/tests/Feature/InsuranceTest.php
- [x] T231 [US8] Write Playwright E2E test for User Story 8 in frontend/tests/e2e/user-story-8-insurance.spec.ts

**Checkpoint**: Insurance module is functional (Phase 2 feature).

---

## Phase 11: User Story 9 - Interface Multilingue pour la Diaspora (Priority: P9 - Phase 2)

**Goal**: La diaspora guinéenne peut utiliser l'interface en français ou en arabe. Les notifications respectent les fuseaux horaires. Les achats de terrains nécessitent une vérification renforcée du titre foncier par ImmoGuinée.

**Independent Test**: Un Guinéen vivant en France (UTC+1) consulte l'interface en français, trouve un terrain à Dubréka sur React Leaflet map, reçoit des notifications WhatsApp adaptées à son fuseau horaire, demande une vérification titre foncier, et achète après validation.

### Backend - Internationalization (FR-092 Phase 2)

- [x] T232 [US9] Create GET /api/locales endpoint in backend/app/Http/Controllers/Api/LocaleController.php::index() (list available languages)
- [x] T233 [US9] Create PATCH /api/auth/me/locale endpoint in backend/app/Http/Controllers/Api/AuthController.php::updateLocale() (save user language preference)
- [x] T234 [US9] Create TimezoneService in backend/app/Services/TimezoneService.php (FR-009 notification timing)
- [x] T235 [US9] Create POST /api/certifications/diaspora/verify endpoint in backend/app/Http/Controllers/Api/CertificationController.php::verifyDiaspora() (enhanced verification FR-009)

### Frontend - i18n

- [x] T236 [US9] Setup next-i18next in frontend/lib/i18n/config.ts
- [x] T237 [P] [US9] Create French translations in frontend/public/locales/fr.json
- [x] T238 [P] [US9] Create Arabic translations in frontend/public/locales/ar.json
- [x] T239 [US9] Create LanguageSelector component in frontend/components/ui/LanguageSelector.tsx
- [x] T240 [US9] Create useLocale hook in frontend/lib/hooks/useLocale.ts (timezone detection & i18n)

### Testing & Validation

- [x] T241 [US9] Write PHPUnit feature test for multilingual in backend/tests/Feature/LocaleTest.php
- [x] T242 [US9] Write Playwright E2E test for User Story 9 in frontend/tests/e2e/user-story-9-i18n.spec.ts

**Checkpoint**: All 9 user stories are now implemented with Laravel 12 + Next.js 16 stack.

---

## Phase 12: Admin Panel with Spatie Permission (FR-081 to FR-085)

**Purpose**: Administrative tools for moderation, user management, analytics, and audit logs

### Backend - Admin Endpoints

- [x] T243 [P] Create GET /api/admin/analytics endpoint in backend/app/Http/Controllers/Api/AdminController.php::analytics() with Spatie Permission middleware (FR-084 15 KPIs)
- [x] T244 [P] Create GET /api/admin/moderation/listings endpoint in AdminController.php::moderationQueue() (FR-081)
- [x] T245 [P] Create PATCH /api/admin/moderation/listings/{id} endpoint in AdminController.php::moderateListing() (FR-082 suspend/delete)
- [x] T246 [P] Create GET /api/admin/users endpoint in AdminController.php::users() (FR-083)
- [x] T247 [P] Create PATCH /api/admin/users/{id} endpoint in AdminController.php::manageUser() with Spatie Permission role updates (FR-083 suspend/ban/downgrade)
- [x] T248 [P] Create GET /api/admin/disputes endpoint in AdminController.php::disputes() (FR-073 mediation queue)
- [x] T249 [P] Create GET /api/admin/logs endpoint in AdminController.php::auditLogs() (FR-085)

### Frontend - Admin UI

- [x] T250 Create useAdmin hook in frontend/lib/hooks/useAdmin.ts (admin operations)
- [x] T251 [P] Create admin dashboard page in frontend/app/(admin)/admin/page.tsx with 15 KPIs (FR-084)
- [x] T252 [P] Create moderation page in frontend/app/(admin)/admin/moderation/page.tsx (FR-081)
- [x] T253 [P] Create users management page in frontend/app/(admin)/admin/users/page.tsx (FR-083)
- [x] T254 [P] Create audit logs page in frontend/app/(admin)/admin/logs/page.tsx (FR-085)
- [x] T255 [P] Write PHPUnit tests for admin in backend/tests/Feature/AdminTest.php

---

## Phase 13: Security & Performance (FR-086 to FR-098)

**Purpose**: Security hardening, performance optimization with Elasticsearch and Varnish, and monitoring

### Backend - Security

- [x] T256 [P] Implement AES-256 encryption in backend/app/Services/EncryptionService.php (FR-086)
- [x] T257 [P] Configure rate limiting in backend/app/Providers/AppServiceProvider.php (FR-087)
- [x] T258 [P] Add CSRF protection to all forms via Laravel Passport (FR-088)
- [x] T259 [P] Implement input sanitization in backend/app/Helpers/SanitizeHelper.php (FR-089)
- [x] T260 Configure SSL/TLS with Let's Encrypt in docker/traefik/traefik.yml (FR-091)
- [x] T261 [P] Add security headers middleware in backend/app/Http/Middleware/SecurityHeaders.php (HSTS, CSP, X-Frame-Options)

### Backend - Performance

- [x] T262 [P] Create Redis caching for popular listings in backend/app/Services/CacheService.php (FR-095)
- [x] T263 [P] Configure Varnish VCL rules for static asset caching in docker/varnish/default.vcl (FR-096)
- [x] T264 [P] Add PostgreSQL indexes for Elasticsearch sync optimization (already in migrations, verify with EXPLAIN queries FR-094)
- [x] T265 Configure CDN for static assets in frontend/next.config.js with Varnish integration (FR-096)
- [x] T266 Setup database read replicas in docker/docker-compose.prod.yml (FR-097)

### Monitoring & Observability

- [x] T267 [P] Setup Laravel Telescope in backend/config/telescope.php
- [x] T268 [P] Create Grafana dashboard for performance metrics in monitoring/grafana/dashboards/performance.json (FR-098)
- [x] T269 [P] Create Grafana dashboard for business metrics in monitoring/grafana/dashboards/business-metrics.json
- [x] T270 [P] Configure Prometheus scraping in monitoring/prometheus/prometheus.yml (FR-098)
- [x] T271 [P] Setup Sentry error tracking in backend/config/sentry.php and frontend/lib/sentry.ts
- [x] T272 [P] Setup Logrocket session replay in frontend/lib/logrocket.ts

### Testing & Validation

- [x] T273 Write k6 load test for Elasticsearch search performance in backend/tests/load/search-performance.js (FR-094 <500ms)
- [x] T274 Write k6 load test for concurrent users in backend/tests/load/concurrent-users.js (FR-097 10K users)
- [x] T275 Run security audit with Laravel Security Checker and npm audit

---

## Phase 14: DevOps & Deployment

**Purpose**: Production deployment with Docker Swarm and CapRover options, CI/CD, and infrastructure

### Docker & Orchestration

- [x] T276 [P] Finalize docker/docker-compose.yml with all 18 services (PostgreSQL+PostGIS, Redis, Elasticsearch, Varnish, MinIO, n8n, WAHA, Laravel Echo, Traefik, Grafana, Prometheus, PgAdmin, Ollama, Queue Worker, Scheduler, etc.)
- [ ] T277 [P] Create docker/docker-compose.prod.yml for production environment
- [ ] T278 [P] Create docker/docker-swarm.yml for Docker Swarm orchestration
- [x] T279 [P] Create Dockerfile at root for CapRover deployment (PHP 8.3-fpm-alpine with all extensions)
- [x] T280 [P] Create docker/php/Dockerfile for Docker Compose local development (PHP 8.3-fpm with dev tools)
- [x] T281 Setup health checks for all services in Docker Compose (postgres, redis, elasticsearch, minio)
- [x] T282 [P] Configure CapRover deployment: captain-definition, .caprover/config.json, .caprover/one-click-apps/immoguinee-full-stack.json with 8 services
- [x] T282a [P] Create comprehensive DEPLOYMENT.md guide with Docker Compose, CapRover, and Docker Swarm instructions
- [x] T282b [P] Create docker/README.md with service documentation, commands, troubleshooting

### CI/CD

- [x] T283 [P] Create GitHub Actions workflow for backend tests in .github/workflows/backend-ci.yml
- [x] T284 [P] Create GitHub Actions workflow for frontend tests in .github/workflows/frontend-ci.yml
- [x] T285 [P] Create GitHub Actions workflow for deployment in .github/workflows/deploy.yml
- [ ] T286 Setup environment secrets in GitHub repository settings

### Backups & Recovery

- [x] T287 [P] Finalize BackupDatabaseCommand in backend/app/Console/Commands/BackupDatabaseCommand.php (FR-090 daily 2h GMT)
- [x] T288 [P] Create RestoreDatabaseCommand for disaster recovery in backend/app/Console/Commands/RestoreDatabaseCommand.php
- [x] T289 Setup automated backup testing (1st of each month FR-090)

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, final testing, and quality assurance

### Documentation

- [ ] T290 [P] Update backend/README.md with Laravel 12 Sail setup instructions, Laravel Passport configuration, Elasticsearch setup
- [ ] T291 [P] Update frontend/README.md with Next.js 16 development instructions, React Leaflet usage
- [ ] T292 [P] Update specs/001-immog-platform/quickstart.md with full developer onboarding guide for Laravel 12 + Next.js 16
- [ ] T293 [P] Create API documentation with Scribe for Laravel in backend/docs/api/
- [ ] T294 [P] Create frontend component documentation with Storybook (optional)

### End-to-End Testing

- [ ] T295 Run all Playwright E2E tests for all 9 user stories
- [ ] T296 [P] Perform manual QA testing on mobile devices (iOS Safari, Android Chrome)
- [ ] T297 [P] Perform manual QA testing on 3G throttled connection (FR-093 <3s load)
- [ ] T298 Validate all 20 Success Criteria (SC-001 to SC-020) from spec.md

### Legal & Compliance

- [ ] T299 [P] Legal review of generated contracts by Guinean lawyer (FR-005 conformité loi 2016/037)
- [ ] T300 [P] Register with Guinea Mobile Money providers (Orange, MTN) as approved partner (FR-092)
- [ ] T301 [P] Privacy policy and terms of service review (FR-092 RGPD local)

### Performance Optimization

- [ ] T302 [P] Optimize frontend bundle size with Next.js 16 bundle analyzer
- [ ] T303 [P] Optimize images with Laravel Image + Imageoptim (already in T085, verify compression quality)
- [ ] T304 [P] Verify Varnish cache hit ratio and tune VCL rules (FR-093)
- [ ] T305 Run Lighthouse audit for all public pages (target: >90 performance score)

### Final Validation

- [ ] T306 Run quickstart.md validation (verify new developer can setup Laravel 12 + Next.js 16 project from scratch)
- [ ] T307 Verify all 98 Functional Requirements (FR-001 to FR-098) are implemented
- [ ] T308 Verify all 9 User Stories can be tested independently
- [ ] T309 Create production deployment checklist
- [ ] T310 Perform load testing with 10,000 concurrent users (SC-012)
- [ ] T311 Validate 99.5% uptime monitoring setup (SC-013)
- [ ] T312 Final security audit and penetration testing

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

### Critical Path

```
Phase 1 (Setup)
  → Phase 2 (Foundational with Laravel 12, Passport, Elasticsearch, PostGIS)
    → Phase 3 (US1: Listings with Elasticsearch search)
      → Phase 4 (US2: Contracts with Laravel PDF)
        → Phase 5 (US3: Signatures)
          → Phase 6 (US4: Payments)
            → Phase 9 (US7: Ratings)
```

**Parallel Track 1** (can start after Foundational):
```
Phase 2 (Foundational) → Phase 7 (US5: Certification with Spatie Permission)
```

**Parallel Track 2** (can start after US1):
```
Phase 3 (US1) → Phase 8 (US6: Messaging with Laravel Echo)
```

**Parallel Track 3** (Phase 2 features):
```
Phase 6 (US4) → Phase 10 (US8: Insurance) | Phase 11 (US9: i18n)
```

### Technology-Specific Dependencies

- **Laravel Passport** (T034-T035): Must complete before any auth endpoints (T078+)
- **Redis 7+** (T057a-T057d): Must complete before cache/sessions/queues/broadcasting (T039, T085, T262+)
- **Elasticsearch** (T054, T092): Must complete before search endpoints (T091)
- **PostGIS** (T011): Must complete before geolocation features (T084, T102)
- **Spatie Permission** (T037-T038): Must complete before admin endpoints (T243+) and certification (T169)
- **Laravel Image + Imageoptim** (T055): Must complete before photo optimization (T085)
- **Varnish** (T057, T263-T264): Can be configured in parallel with development
- **React Leaflet** (T069): Must complete before map components (T102, T108)

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Backend models before services
- Backend services before controllers
- Backend controllers before frontend hooks
- Frontend hooks before frontend components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

#### Phase 1 (Setup)
- T002 (Next.js init) || T001 (Laravel init)
- T003 (Docker Compose) || T004 (Env files) || T005 (ESLint) || T006 (PHP CS Fixer) || T009 (Monitoring)

#### Phase 2 (Foundational)
- All migrations T016-T022 can run in parallel
- All models T027-T033 can run in parallel
- All repositories T043-T047 can run in parallel
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
# Launch all migrations in parallel:
sail artisan migrate --path=database/migrations/2025_01_28_000006_create_certification_documents_table.php
sail artisan migrate --path=database/migrations/2025_01_28_000007_create_conversations_table.php
sail artisan migrate --path=database/migrations/2025_01_28_000008_create_messages_table.php
# (all run simultaneously)

# Configure Laravel Passport and Elasticsearch in parallel:
Task: "Install and configure Laravel Passport in backend/config/passport.php"
Task: "Create Elasticsearch client config in backend/config/scout.php"
# (different services, can configure simultaneously)
```

---

## Implementation Strategy

### MVP First (User Stories 1-4 Only)

1. Complete Phase 1: Setup with Laravel 12 + Next.js 16 + Elasticsearch + PostGIS
2. Complete Phase 2: Foundational with Laravel Passport, Spatie Permission, Elasticsearch, PostGIS, Varnish (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Listings with Elasticsearch search and React Leaflet maps)
4. Complete Phase 4: User Story 2 (Contracts with Laravel PDF)
5. Complete Phase 5: User Story 3 (Signatures)
6. Complete Phase 6: User Story 4 (Payments)
7. **STOP and VALIDATE**: Test full transaction flow independently
8. Deploy/demo MVP

**MVP Validation Checklist**:
- [ ] User can register with OTP SMS and receive Laravel Passport OAuth2 token
- [ ] User can publish listing with photos optimized by Laravel Image + Imageoptim
- [ ] Searcher can find listings via Elasticsearch without authentication
- [ ] Listings display on React Leaflet interactive map
- [ ] Parties can generate contract compliant with loi 2016/037 using Laravel PDF
- [ ] Parties can sign contract electronically via OTP SMS
- [ ] Tenant can pay caution + commission via Orange/MTN
- [ ] Commission is collected before caution transfer
- [ ] Quittance PDF is generated automatically with Laravel PDF

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (Laravel 12, Passport, Elasticsearch, PostGIS, Varnish)
2. Add User Story 1 → Test independently → Deploy/Demo (Browse & publish with Elasticsearch!)
3. Add User Story 2 → Test independently → Deploy/Demo (Contracts with Laravel PDF!)
4. Add User Story 3 → Test independently → Deploy/Demo (E-signatures!)
5. Add User Story 4 → Test independently → Deploy/Demo (Payments! 🎯 **FULL MVP**)
6. Add User Story 5 → Test independently → Deploy/Demo (Certification with Spatie Permission!)
7. Add User Story 6 → Test independently → Deploy/Demo (Messaging with Laravel Echo!)
8. Add User Story 7 → Test independently → Deploy/Demo (Ratings!)
9. Add User Stories 8-9 (Phase 2 features) → Deploy
10. Add Admin Panel with Spatie Permission → Deploy
11. Polish & Optimize → Production ready

### Parallel Team Strategy

With 5 developers after Foundational phase:

1. **Team completes Setup + Foundational together** (T001-T077) - Laravel 12, Passport, Elasticsearch, PostGIS, Spatie Permission
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Listings with Elasticsearch) - T078-T111
   - **Developer B**: User Story 5 (Certification with Spatie Permission) - T169-T181
   - **Developer C**: Admin Panel (Phase 12 with Spatie Permission) - T243-T255
   - **Developer D**: DevOps & Infrastructure (Docker Swarm, CapRover) - T276-T289
   - **Developer E**: Security & Monitoring - T256-T275
3. After US1 completes:
   - **Developer A**: User Story 2 (Contracts with Laravel PDF) - T112-T130
   - **Developer B**: User Story 6 (Messaging with Laravel Echo) - T182-T200
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
- **Total Tasks**: 316 tasks organized across 15 phases
- **Estimated Timeline**:
  - MVP (US1-US4): 8-12 weeks with 3-5 developers
  - Full Platform (US1-US9 + Admin): 16-24 weeks with 3-5 developers
- **Tech Stack Updates**:
  - **Laravel 12** with **Laravel Passport** (OAuth2 server)
  - **Elasticsearch** with Laravel Scout for advanced search
  - **PostgreSQL + PostGIS** for geospatial support
  - **Redis 7+** for cache, sessions, queues, and broadcasting
  - **Varnish** for HTTP caching
  - **Spatie Permission** for role-based access control
  - **Laravel Image + Imageoptim** for photo optimization
  - **Geocoder** for geolocation
  - **React Leaflet** for interactive maps
  - **Docker Swarm + CapRover** deployment options
- **Success Criteria**: All 20 SC metrics (SC-001 to SC-020) must pass before production deployment

---

**End of Tasks**
