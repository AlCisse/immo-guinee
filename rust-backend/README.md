# ImmoGuinée — Backend Rust

Backend de la plateforme ImmoGuinée, écrit en **Rust (Axum + Tokio)**.

> Un prototype backend **Laravel 12** définissait les mêmes fonctionnalités mais **n'a jamais été
> déployé en production**. Ce backend Rust le **remplace directement** (greenfield, pas de cohabitation,
> pas de migration de données). Le schéma PostgreSQL est **possédé par les migrations Rust**.
> Spécifications : `specs/001-immog-platform/`.

- **Édition** Rust 2024 · **rust-version** ≥ 1.85
- **Binaires** : `immog-backend` (serveur API) · `immog-migrate` (migrations) · `immog-seed` (données de test)

## Stack

| Domaine | Approche / Crate |
|---|---|
| Web / routing / middleware | Axum + Tower (`axum`, `tower`, `tower-http`) |
| Runtime async | Tokio (`tokio`) |
| ORM + migrations | SeaORM sur SQLx (`sea-orm`, `sea-orm-migration`, `sqlx`) — PostgreSQL |
| Auth | JWT access/refresh (`jsonwebtoken`) ; OAuth2 serveur tiers si besoin (`oxide-auth`) |
| Sessions (frontend stateful) | `tower-sessions` |
| 2FA TOTP | `totp-rs` (RFC 6238) |
| Mots de passe | `bcrypt` |
| RBAC | **natif** — table statique rôles/permissions dans `src/auth/rbac.rs` (aucune crate) |
| Jobs / scheduler | `apalis` (Redis) + `tokio-cron-scheduler` |
| Broadcasting temps réel | Axum WebSocket (pusher-compat) |
| Notifications multi-canal | `reqwest` (Twilio SMS / WAHA WhatsApp / Expo Push) + `lettre` (email) |
| Validation | `validator` |
| Recherche | `elasticsearch` |
| PDF | `headless-chrome` (HTML → PDF) |
| Images / watermarks | `image`, `imageproc` |
| Stockage objet (S3) | `aws-sdk-s3` (MinIO en dev, DO Spaces en prod) |
| Client HTTP | `reqwest` |
| Cache Redis | `redis`, `deadpool-redis` |
| Config | `figment` (env `IMMOG_*` + `config.toml` + defaults) |
| Logs / erreurs | `tracing` (+ `sentry`) · `thiserror`, `anyhow` |
| Secrets + chiffrement | HashiCorp Vault (KV + Transit) via `vaultrs` |
| Tests | `cargo test` + `axum-test` + `mockall` |

> **Sécurité** : en production, secrets et clés de chiffrement viennent de **Vault** (pas de `.env`).
> Le JWT est signé avec un secret chargé depuis Vault ; les mots de passe sont hachés avec `bcrypt`.

## Arborescence

```
rust-backend/
├── Cargo.toml              # deps fondatrices (décommentées) + deps phase-specific (commentées)
├── config.toml             # config non-secret (override IMMOG_* env)
├── .env.example            # dev (prod = Vault)
├── src/
│   ├── lib.rs              # crate-bibliothèque partagée par les binaires
│   ├── main.rs             # entrypoint serveur (boot Axum + AppState)
│   ├── bin/
│   │   ├── migrate.rs      # immog-migrate (sea-orm-migration : up | status | down | fresh)
│   │   └── seed.rs         # immog-seed (données de test)  [à venir]
│   ├── config.rs           # figment (env + toml + defaults)
│   ├── state.rs            # AppState = "service container" (DB, Redis, JWT, Vault, S3…)
│   ├── error.rs            # AppError -> réponses JSON structurées
│   ├── routes/             # router (mod.rs) + health.rs ; domaines ajoutés par phase
│   ├── middleware/         # Tower layers (security_headers ; rate_limit, sanitize à venir)
│   ├── extractors/         # AuthUser (+ gardes RBAC), ValidatedJson, Locale
│   ├── db/
│   │   ├── entities/       # 12 entités SeaORM + sea_orm_active_enums
│   │   └── migration/      # migrations sea-orm (enums + 12 tables) — source de vérité du schéma
│   ├── auth/               # jwt, rbac (natif) ; totp, oauth2, sessions à venir
│   ├── domain/             # logique métier par domaine (listings, visits, contracts, payments…)
│   ├── services/           # services métier (Escrow, OTP, Twilio, WAHA, Orange/MTN MoMo…)
│   ├── jobs/               # jobs apalis + scheduler
│   └── notifications/      # Notifiable + channels (SMS/WhatsApp/Push/Email)
└── Dockerfile              # (à ajouter)
```

## Ordre de construction

Le backend est construit domaine par domaine, du plus simple au plus sensible. Chaque domaine est mis en
ligne dès qu'il est implémenté et testé (`cargo test` + intégration `axum-test`).

| Phase | Domaine | Risque |
|---|---|---|
| 0 | Fondations (boot, DB, auth, Vault, Redis, S3, `/health`) | 🟢 |
| 1 | Listings (recherche + détail public, lecture seule) | 🟡 |
| 2 | Visites + Messagerie (WebSocket temps réel) | 🟡 |
| 3 | Contrats (PDF, signature OTP, archivage, intégrité) | 🟠 |
| 4 | **Paiements** (escrow, Orange/MTN MoMo, 2FA, commission) | 🔴 tests stricts |
| 5 | Admin/Modération, Notifications, Jobs/Scheduler | 🟠 |

> 🔴 Le domaine **Paiements** manipule de l'argent : couverture de tests stricte exigée.
> **Aucune mise en production sans le mot `deploy`** (voir `CLAUDE.md`).

## État d'avancement

- ✅ **Fondations** — crate (lib + bins), `config` (figment), `AppState` (PostgreSQL + Redis + JWT),
  `AppError` (JSON), route `/api/health`, security headers + CORS (Tower).
- ✅ **Base de données** — migrations `sea-orm-migration` : 24 enums PG natifs + 12 tables
  (users, listings, visits, contracts, payments, certification_documents, ratings, conversations,
  messages, disputes, transactions, insurances) ; 12 entités SeaORM.
- ✅ **Auth** — JWT access (24h) / refresh (7j), extracteur `AuthUser`, **RBAC natif**
  (6 rôles / 11 permissions) + gardes `require_role` / `require_permission`.
- ⏳ **À venir** — OTP (Redis + Twilio), TOTP 2FA, rate-limiting, client Vault, client S3, domaines
  métier (listings → paiements), jobs/scheduler, notifications.
- ⚠️ **PostGIS non implémenté** — la géolocalisation repose actuellement sur l'enum `quartier` ;
  la géométrie GPS (PostGIS) est une amélioration ultérieure.

## Démarrage

```bash
# 1. Config dev
cp .env.example .env
# ajuster IMMOG_DATABASE_URL / IMMOG_REDIS_URL (Postgres + Redis locaux)

# 2. Appliquer les migrations (créent enums + tables ; source de vérité du schéma)
cargo run --bin immog-migrate -- up
cargo run --bin immog-migrate -- status

# 3. (Optionnel) régénérer les entités depuis la base après migration
cargo install sea-orm-cli
sea-orm-cli generate entity -u "$IMMOG_DATABASE_URL" -o src/db/entities --with-serde both

# 4. Build + tests + run
cargo test               # tests unitaires (auth, rbac, …)
cargo run                # immog-backend sur 0.0.0.0:8000

# 5. Health check
curl http://localhost:8000/api/health
```

> Le `Cargo.toml` ne décommente que les deps fondatrices (web/db/redis/serde/auth de base/config/
> tracing/erreurs) pour garder `cargo check` rapide. Les deps phase-specific (apalis, aws-sdk-s3,
> vaultrs, oxide-auth, elasticsearch, headless-chrome, image, lettre, pusher…) sont en commentaire
> et s'activent au démarrage de chaque domaine. Le RBAC est **natif** (aucune crate).

## Notes (conformément au CLAUDE.md)

- 🔴 Le domaine **Paiements** (escrow, commission, Mobile Money) exige une validation de tests stricte.
  **Aucune mise en production sans le mot `deploy`**.
- Les secrets en production viennent de **Vault** (KV + Transit), pas de `.env` — voir
  `specs/001-immog-platform/contracts/`. Le client `vaultrs` sera câblé en phase Fondations.
- Chiffrement des données sensibles (contrats signés, documents d'identité, messages) via **Vault
  Transit** — pas de clé applicative statique.
