# Data Model: ImmoGuinée Platform

**Feature**: ImmoGuinée - Plateforme Immobilière pour la Guinée
**Branch**: `001-immog-platform`
**Date**: 2025-01-28 (schéma) · **Stack Rust/SeaORM**: 2026-07-19
**Phase**: 1 (Design)

---

## Overview

This document defines the complete database schema for ImmoGuinée using **SeaORM 1.1** (sur SQLx 0.8)
with **PostgreSQL 15+**. The schema implements all 11 key entities from the feature specification with
proper relations, constraints, and indexes for performance.

> **Note stack (backend Rust)** : le **modèle de données** (tables, colonnes, types, enums natifs,
> index, contraintes) est conçu pour **PostgreSQL** et **possédé par le backend Rust** : il est défini
> par les **migrations `sea-orm-migration`**, l'accès se fait via **SeaORM/SQLx**, et le seeding via des
> **seeds Rust** (`fake`). Un prototype Laravel/Eloquent définissait auparavant ce schéma, mais il n'a
> jamais été déployé : les migrations Rust sont désormais la **source de vérité** unique du schéma.
> Les entités peuvent être écrites à la main ou **générées** avec `sea-orm-cli generate entity` après
> une première application des migrations.

**Total Entities**: 12 (dont Visit)
**Total Enums**: 13 (types PostgreSQL natifs, mappés en Rust via `DeriveActiveEnum`)
**Estimated Tables**: 12 core + 3 junction tables (many-to-many)
**Indexes Strategy**: 25+ indexes for search, filtering, and performance (FR-094: <500ms search)

**ORM**: SeaORM (Active Record + Entity pattern, sur SQLx)
**Migration System**: `sea-orm-migration` (binaire `immog-migrate`)
**Seeding**: seeds Rust (`fake` crate) + binaire `immog-seed`

---

## Entity Relationship Diagram (ERD)

```
User (Utilisateur)
 │
 ├──< Listing (Annonce) [1:N]
 │    │
 │    ├──< Visit (Visite) [1:N]
 │    │
 │    └──< Contract [1:N]
 │         │
 │         ├──< Payment [1:N]
 │         │    └── Quittance (embedded in Payment PDF)
 │         │
 │         └──< Insurance [1:1] (Phase 2)
 │
 ├──< CertificationDocument [1:N]
 │
 ├──< Transaction [N:M via proprietaire_id, locataire_id]
 │    └──< Rating [1:1 per transaction]
 │
 ├──< Conversation [N:M via participant_1_id, participant_2_id]
 │    └──< Message [1:N]
 │
 └──< Dispute [N:M via demandeur_id, defendeur_id]
```

---

## Database Enums (PostgreSQL Native)

Le schéma utilise des **types ENUM PostgreSQL natifs**. Dans SeaORM, on les crée via SQL brut dans la
migration (`execute_unprepared`) — approche idiomatique pour un schéma à enums natifs — puis on les
mappe en enums Rust côté entités (voir section « SeaORM Entities »).

```rust
// rust-backend/src/db/migration/m20250128_000001_create_enums.rs
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const ENUMS_UP: &str = r#"
    CREATE TYPE badge AS ENUM ('BRONZE', 'ARGENT', 'OR', 'DIAMANT');
    CREATE TYPE type_compte AS ENUM ('PARTICULIER', 'AGENCE', 'DIASPORA');
    CREATE TYPE statut_verification AS ENUM ('NON_VERIFIE', 'CNI_VERIFIEE', 'TITRE_FONCIER_VERIFIE');
    CREATE TYPE statut_compte AS ENUM ('ACTIF', 'SUSPENDU', 'BANNI', 'SUPPRIME');
    CREATE TYPE type_operation AS ENUM ('LOCATION', 'VENTE');
    CREATE TYPE type_bien AS ENUM ('VILLA', 'APPARTEMENT', 'STUDIO', 'TERRAIN', 'COMMERCE', 'BUREAU', 'ENTREPOT');
    CREATE TYPE quartier AS ENUM ('KALOUM', 'DIXINN', 'RATOMA', 'MATAM', 'MATOTO', 'DUBREKA_CENTRE', 'DUBREKA_PERIPHERIE', 'COYAH_CENTRE', 'COYAH_PERIPHERIE');
    CREATE TYPE statut_listing AS ENUM ('DISPONIBLE', 'EN_NEGOCIATION', 'LOUE_VENDU', 'EXPIRE', 'ARCHIVE', 'SUSPENDU');
    CREATE TYPE type_contrat AS ENUM ('BAIL_LOCATION_RESIDENTIEL', 'BAIL_LOCATION_COMMERCIAL', 'PROMESSE_VENTE_TERRAIN', 'MANDAT_GESTION', 'ATTESTATION_CAUTION');
    CREATE TYPE statut_contrat AS ENUM ('BROUILLON', 'EN_ATTENTE_SIGNATURE', 'PARTIELLEMENT_SIGNE', 'SIGNE_ARCHIVE', 'ANNULE');
    CREATE TYPE type_paiement AS ENUM ('CAUTION', 'LOYER_MENSUEL', 'COMMISSION_PLATEFORME', 'VENTE', 'FRAIS_PREMIUM');
    CREATE TYPE methode_paiement AS ENUM ('ORANGE_MONEY', 'MTN_MOMO', 'ESPECES', 'VIREMENT_BANCAIRE');
    CREATE TYPE statut_paiement AS ENUM ('INITIE', 'EN_ATTENTE_OTP', 'EN_ESCROW', 'COMMISSION_COLLECTEE', 'CONFIRME', 'ECHOUE', 'REMBOURSE');
    CREATE TYPE type_document AS ENUM ('CNI', 'TITRE_FONCIER', 'PASSEPORT');
    CREATE TYPE statut_verification_doc AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE');
    CREATE TYPE type_message AS ENUM ('TEXTE', 'VOCAL', 'PHOTO', 'LOCALISATION_GPS');
    CREATE TYPE statut_lecture AS ENUM ('ENVOYE', 'LIVRE', 'LU');
    CREATE TYPE statut_conversation AS ENUM ('ACTIVE', 'ARCHIVEE');
    CREATE TYPE type_litige AS ENUM ('IMPAYE', 'DEGATS', 'EXPULSION_ABUSIVE', 'CAUTION_NON_REMBOURSEE', 'AUTRE');
    CREATE TYPE statut_litige AS ENUM ('OUVERT', 'EN_COURS', 'RESOLU_AMIABLE', 'RESOLU_COMPENSATION', 'ECHOUE_ESCALADE');
    CREATE TYPE type_assurance AS ENUM ('SEJOUR_SEREIN', 'LOYER_GARANTI');
    CREATE TYPE statut_assurance AS ENUM ('ACTIVE', 'RESILIEE', 'SUSPENDUE');
    CREATE TYPE statut_transaction AS ENUM ('EN_COURS', 'COMPLETEE', 'ANNULEE');
    CREATE TYPE statut_visite AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'COMPLETEE', 'ANNULEE');
"#;

const ENUMS_DOWN: &str = r#"
    DROP TYPE IF EXISTS statut_visite;
    DROP TYPE IF EXISTS statut_transaction;
    DROP TYPE IF EXISTS statut_assurance;
    DROP TYPE IF EXISTS type_assurance;
    DROP TYPE IF EXISTS statut_litige;
    DROP TYPE IF EXISTS type_litige;
    DROP TYPE IF EXISTS statut_conversation;
    DROP TYPE IF EXISTS statut_lecture;
    DROP TYPE IF EXISTS type_message;
    DROP TYPE IF EXISTS statut_verification_doc;
    DROP TYPE IF EXISTS type_document;
    DROP TYPE IF EXISTS statut_paiement;
    DROP TYPE IF EXISTS methode_paiement;
    DROP TYPE IF EXISTS type_paiement;
    DROP TYPE IF EXISTS statut_contrat;
    DROP TYPE IF EXISTS type_contrat;
    DROP TYPE IF EXISTS statut_listing;
    DROP TYPE IF EXISTS quartier;
    DROP TYPE IF EXISTS type_bien;
    DROP TYPE IF EXISTS type_operation;
    DROP TYPE IF EXISTS statut_compte;
    DROP TYPE IF EXISTS statut_verification;
    DROP TYPE IF EXISTS type_compte;
    DROP TYPE IF EXISTS badge;
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(ENUMS_UP).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(ENUMS_DOWN).await?;
        Ok(())
    }
}
```

---

## SeaORM Migrations (SQL DDL)

Les migrations de tables sont écrites en **SQL DDL brut** via `execute_unprepared` (le schéma s'appuie
lourdement sur les enums PG natifs, ce qui rend le SQL plus lisible et fidèle au schéma que le
Query Builder). Toutes les tables utilisent des **UUID** en clé primaire, `TIMESTAMPTZ`, et `BIGINT` pour
les montants GNF. Chaque migration expose `up()`/`down()` (structure identique à l'exemple des enums).

### 1. Users Table

```sql
-- rust-backend/src/db/migration/m20250128_000002_create_users.rs (execute_unprepared)
CREATE TABLE users (
    id                       UUID PRIMARY KEY,
    -- Authentication
    telephone                VARCHAR(20) UNIQUE NOT NULL,          -- +224 6XX XXX XXX
    email                    VARCHAR(255),
    mot_de_passe_hash        VARCHAR(255) NOT NULL,                -- bcrypt (crate `bcrypt`)
    -- Profile
    nom_complet              VARCHAR(255) NOT NULL,
    photo_profil_url         TEXT,
    bio                      VARCHAR(500),
    -- Type & Status (enums PG natifs)
    type_compte              type_compte NOT NULL DEFAULT 'PARTICULIER',
    badge_certification      badge NOT NULL DEFAULT 'BRONZE',
    statut_verification      statut_verification NOT NULL DEFAULT 'NON_VERIFIE',
    statut_compte            statut_compte NOT NULL DEFAULT 'ACTIF',
    -- Metrics (calculated fields)
    note_moyenne             REAL NOT NULL DEFAULT 0,
    nombre_transactions      INTEGER NOT NULL DEFAULT 0,
    nombre_litiges           INTEGER NOT NULL DEFAULT 0,
    -- Notifications Preferences (JSONB): {"push":true,"sms":true,"email":true,"whatsapp":false}
    preferences_notification JSONB NOT NULL DEFAULT '{"push":true,"sms":true,"email":true,"whatsapp":false}',
    -- Timestamps
    date_inscription         TIMESTAMPTZ NOT NULL DEFAULT now(),
    derniere_connexion       TIMESTAMPTZ,
    date_suppression         TIMESTAMPTZ,                          -- Soft delete
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_telephone           ON users(telephone);
CREATE INDEX idx_users_badge_certification ON users(badge_certification);
CREATE INDEX idx_users_note_moyenne        ON users(note_moyenne);
CREATE INDEX idx_users_statut_compte       ON users(statut_compte);
```

### 2. Listings Table

```sql
-- rust-backend/src/db/migration/m20250128_000003_create_listings.rs
CREATE TABLE listings (
    id                UUID PRIMARY KEY,
    createur_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Basics (enums PG natifs)
    type_operation    type_operation NOT NULL,
    type_bien         type_bien NOT NULL,
    titre             VARCHAR(100) NOT NULL,
    description       VARCHAR(2000) NOT NULL,
    prix_gnf          BIGINT NOT NULL,                             -- BIGINT pour les gros montants GNF
    -- Location
    quartier          quartier NOT NULL,
    adresse_complete  VARCHAR(500),
    -- Details
    superficie_m2     INTEGER,                                    -- terrains/villas
    nombre_chambres   INTEGER,
    nombre_salons     INTEGER,
    caution_mois      INTEGER,                                    -- 1-6 mois pour locations (FR-012)
    -- Equipements (JSONB array): ["Climatisation","Eau courante",...]
    equipements       JSONB NOT NULL DEFAULT '[]',
    -- Photos (JSONB array): [{"original":"s3://","large":"...","medium":"...","thumbnail":"..."}]
    photos            JSONB NOT NULL DEFAULT '[]',
    -- Status & Metrics
    statut            statut_listing NOT NULL DEFAULT 'DISPONIBLE',
    nombre_vues       INTEGER NOT NULL DEFAULT 0,
    -- Premium Options (JSONB): {"badge_urgent":false,"remontee_48h":false,"photos_pro":false}
    options_premium   JSONB NOT NULL DEFAULT '{"badge_urgent":false,"remontee_48h":false,"photos_pro":false}',
    -- Timestamps
    date_publication  TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_derniere_maj TIMESTAMPTZ,
    date_expiration   TIMESTAMPTZ NOT NULL,                       -- publication + 90 jours (FR-014)
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Indexes de performance (FR-094: <500ms)
CREATE INDEX idx_listings_quartier_statut ON listings(quartier, statut);
CREATE INDEX idx_listings_typebien_statut ON listings(type_bien, statut);
CREATE INDEX idx_listings_prix_statut     ON listings(prix_gnf, statut);
CREATE INDEX idx_listings_date_pub        ON listings(date_publication);
CREATE INDEX idx_listings_nombre_vues     ON listings(nombre_vues);
-- Full-text search (PostgreSQL GIN)
CREATE INDEX listings_fulltext_idx ON listings USING GIN(to_tsvector('french', titre || ' ' || description));
```

### 3. Contracts Table

```sql
-- rust-backend/src/db/migration/m20250128_000004_create_contracts.rs
CREATE TABLE contracts (
    id                        UUID PRIMARY KEY,
    type_contrat              type_contrat NOT NULL,
    -- Parties
    annonce_id                UUID REFERENCES listings(id) ON DELETE SET NULL,
    proprietaire_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    locataire_acheteur_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    -- Contract Data (JSONB, customizable per type_contrat)
    -- BAIL_LOCATION: {"duree_bail_mois":12,"montant_loyer_gnf":2500000,"montant_caution_gnf":7500000,"date_debut":"2025-02-01","clauses_specifiques":[]}
    donnees_personnalisees    JSONB NOT NULL,
    -- Status & PDF
    statut                    statut_contrat NOT NULL DEFAULT 'BROUILLON',
    fichier_pdf_url           TEXT,                               -- S3 URL
    hash_sha256               VARCHAR(64) UNIQUE,                 -- integrity check (FR-030)
    -- Signatures (JSONB array): [{"user_id":"uuid","nom":"...","timestamp":"...","otp_valide":true}]
    signatures                JSONB NOT NULL DEFAULT '[]',
    -- Timestamps
    date_creation             TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_signature_complete   TIMESTAMPTZ,
    delai_retractation_expire TIMESTAMPTZ,                        -- signature_complete + 48h (FR-033)
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contracts_statut        ON contracts(statut);
CREATE INDEX idx_contracts_proprietaire  ON contracts(proprietaire_id);
CREATE INDEX idx_contracts_locataire     ON contracts(locataire_acheteur_id);
CREATE INDEX idx_contracts_date_creation ON contracts(date_creation);
```

### 4. Payments Table

```sql
-- rust-backend/src/db/migration/m20250128_000005_create_payments.rs
CREATE TABLE payments (
    id                          UUID PRIMARY KEY,
    -- Parties
    payeur_id                   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    beneficiaire_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    contrat_id                  UUID REFERENCES contracts(id) ON DELETE SET NULL,
    -- Payment Details
    type_paiement               type_paiement NOT NULL,
    montant_gnf                 BIGINT NOT NULL,
    commission_plateforme_gnf   BIGINT NOT NULL DEFAULT 0,        -- FR-040 (calculée selon le type)
    montant_total_gnf           BIGINT NOT NULL,                  -- montant + commission
    methode_paiement            methode_paiement NOT NULL,
    statut                      statut_paiement NOT NULL DEFAULT 'INITIE',
    -- External Transaction
    numero_transaction_externe  VARCHAR(255),                    -- ID transaction Orange/MTN
    -- Quittance (Receipt PDF)
    quittance_pdf_url           TEXT,                            -- S3 URL (FR-046)
    -- Retry Logic (FR-051)
    tentatives_paiement         INTEGER NOT NULL DEFAULT 0,      -- max 3
    -- Timestamps
    date_creation               TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_confirmation           TIMESTAMPTZ,                     -- webhook reçu
    date_validation_beneficiaire TIMESTAMPTZ,                    -- validation propriétaire (FR-044)
    date_deblocage_escrow       TIMESTAMPTZ,                     -- déblocage escrow
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_statut        ON payments(statut);
CREATE INDEX idx_payments_payeur        ON payments(payeur_id);
CREATE INDEX idx_payments_beneficiaire  ON payments(beneficiaire_id);
CREATE INDEX idx_payments_contrat       ON payments(contrat_id);
CREATE INDEX idx_payments_date_creation ON payments(date_creation);
```

### 5. Certification Documents Table

```sql
-- rust-backend/src/db/migration/m20250128_000006_create_certification_documents.rs
CREATE TABLE certification_documents (
    id                     UUID PRIMARY KEY,
    utilisateur_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type_document          type_document NOT NULL,
    fichier_url            TEXT NOT NULL,                         -- S3 URL (chiffré via Vault Transit)
    statut_verification    statut_verification_doc NOT NULL DEFAULT 'EN_ATTENTE',
    commentaire_verification VARCHAR(500),                       -- si rejeté
    verifie_par_admin_id   UUID,
    date_upload            TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_verification      TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_certdocs_utilisateur ON certification_documents(utilisateur_id);
CREATE INDEX idx_certdocs_statut      ON certification_documents(statut_verification);
```

### 6. Ratings Table

```sql
-- rust-backend/src/db/migration/m20250128_000007_create_ratings.rs
CREATE TABLE ratings (
    id                UUID PRIMARY KEY,
    evaluateur_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evalue_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id    UUID UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    -- Rating (1-5 stars)
    note_globale      SMALLINT NOT NULL,                          -- moyenne des 3 critères
    critere_1_note    SMALLINT NOT NULL,
    critere_2_note    SMALLINT NOT NULL,
    critere_3_note    SMALLINT NOT NULL,
    commentaire       VARCHAR(500) NOT NULL,                      -- 20-500 chars (FR-068)
    -- Moderation
    statut_moderation statut_verification_doc NOT NULL DEFAULT 'EN_ATTENTE',
    mots_cles_detectes JSONB NOT NULL DEFAULT '[]',
    date_creation     TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_publication  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ratings_evalue      ON ratings(evalue_id);
CREATE INDEX idx_ratings_note        ON ratings(note_globale);
CREATE INDEX idx_ratings_moderation  ON ratings(statut_moderation);
```

### 7. Conversations Table

```sql
-- rust-backend/src/db/migration/m20250128_000008_create_conversations.rs
CREATE TABLE conversations (
    id                   UUID PRIMARY KEY,
    annonce_id           UUID,
    participant_1_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_2_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    numeros_partages     BOOLEAN NOT NULL DEFAULT false,          -- FR-060
    statut               statut_conversation NOT NULL DEFAULT 'ACTIVE',
    date_creation        TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_dernier_message TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- One conversation per listing per pair
    UNIQUE (participant_1_id, participant_2_id, annonce_id)
);
CREATE INDEX idx_conversations_p1            ON conversations(participant_1_id);
CREATE INDEX idx_conversations_p2            ON conversations(participant_2_id);
CREATE INDEX idx_conversations_dernier_msg   ON conversations(date_dernier_message);
```

### 8. Messages Table

```sql
-- rust-backend/src/db/migration/m20250128_000009_create_messages.rs
CREATE TABLE messages (
    id                  UUID PRIMARY KEY,
    conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    expediteur_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type_message        type_message NOT NULL,
    contenu_texte       VARCHAR(2000),                            -- type TEXTE
    fichier_url         TEXT,                                     -- type VOCAL/PHOTO (S3 URL)
    localisation_lat_lng VARCHAR(50),                            -- type LOCALISATION_GPS ("lat,lng")
    horodatage          TIMESTAMPTZ NOT NULL DEFAULT now(),
    statut_lecture      statut_lecture NOT NULL DEFAULT 'ENVOYE',
    signale             BOOLEAN NOT NULL DEFAULT false,
    raison_signalement  VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conv_horodatage ON messages(conversation_id, horodatage);
CREATE INDEX idx_messages_expediteur      ON messages(expediteur_id);
```

### 9. Disputes Table

```sql
-- rust-backend/src/db/migration/m20250128_000010_create_disputes.rs
CREATE TABLE disputes (
    id                       UUID PRIMARY KEY,
    reference                VARCHAR(20) UNIQUE NOT NULL,          -- ex: "LIT-1234"
    transaction_id           UUID REFERENCES transactions(id) ON DELETE SET NULL,
    demandeur_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    defendeur_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    type_litige              type_litige NOT NULL,
    description              VARCHAR(2000) NOT NULL,               -- 200-2000 chars (FR-072)
    -- Preuves (JSONB array): [{"type":"photo|document","url":"s3://","nom_fichier":"file.jpg"}]
    preuves_urls             JSONB NOT NULL DEFAULT '[]',
    statut                   statut_litige NOT NULL DEFAULT 'OUVERT',
    mediateur_assigne_id     UUID,
    -- Resolution (JSONB): {"issue":"amiable|compensation|echec","montant_compensation_gnf":1000000,"accord_parties":true,"notes":"..."}
    resolution               JSONB,
    date_ouverture           TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_assignation_mediateur TIMESTAMPTZ,
    date_resolution          TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_disputes_statut     ON disputes(statut);
CREATE INDEX idx_disputes_demandeur  ON disputes(demandeur_id);
CREATE INDEX idx_disputes_defendeur  ON disputes(defendeur_id);
CREATE INDEX idx_disputes_ouverture  ON disputes(date_ouverture);
```

### 10. Transactions Table

```sql
-- rust-backend/src/db/migration/m20250128_000011_create_transactions.rs
CREATE TABLE transactions (
    id                        UUID PRIMARY KEY,
    annonce_id                UUID,
    proprietaire_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    locataire_acheteur_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    contrat_id                UUID UNIQUE NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    -- Payments (JSONB array of payment IDs): ["uuid1","uuid2",...]
    paiements_ids             JSONB NOT NULL DEFAULT '[]',
    type_transaction          type_operation NOT NULL,            -- LOCATION ou VENTE
    montant_total_gnf         BIGINT NOT NULL,
    commission_plateforme_gnf BIGINT NOT NULL,
    statut                    statut_transaction NOT NULL DEFAULT 'EN_COURS',
    date_debut                TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_completion           TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_proprietaire ON transactions(proprietaire_id);
CREATE INDEX idx_transactions_locataire    ON transactions(locataire_acheteur_id);
CREATE INDEX idx_transactions_statut       ON transactions(statut);
CREATE INDEX idx_transactions_completion   ON transactions(date_completion);
```

### 11. Insurances Table (Phase 2)

```sql
-- rust-backend/src/db/migration/m20250128_000012_create_insurances.rs
CREATE TABLE insurances (
    id                UUID PRIMARY KEY,
    utilisateur_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contrat_id        UUID UNIQUE NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    type_assurance    type_assurance NOT NULL,
    numero_police     VARCHAR(50) UNIQUE NOT NULL,                -- ex: "ASSUR-SS-1234"
    prime_mensuelle_gnf INTEGER NOT NULL,
    -- Couvertures (JSONB) — SEJOUR_SEREIN: {"expulsion_abusive":true,"caution":true,"assistance_juridique":true}
    couvertures       JSONB NOT NULL,
    -- Plafonds (JSONB): {"expulsion":"3_mois_loyer","degats":1000000}
    plafonds          JSONB NOT NULL,
    statut            statut_assurance NOT NULL DEFAULT 'ACTIVE',
    date_souscription TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_expiration   TIMESTAMPTZ NOT NULL,                       -- souscription + 1 an
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_insurances_utilisateur ON insurances(utilisateur_id);
CREATE INDEX idx_insurances_statut      ON insurances(statut);
```

### 12. Visits Table

```sql
-- rust-backend/src/db/migration/m20250128_000015_create_visits.rs
CREATE TABLE visits (
    id                UUID PRIMARY KEY,
    annonce_id        UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    demandeur_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- chercheur
    proprietaire_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- créateur de l'annonce
    date_visite       TIMESTAMPTZ NOT NULL,                                   -- créneau proposé/confirmé
    statut            statut_visite NOT NULL DEFAULT 'EN_ATTENTE',
    message           VARCHAR(500),                                           -- note optionnelle du demandeur
    lien_public_token VARCHAR(64) UNIQUE,                                     -- réponse via lien public (sans compte)
    date_creation     TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_confirmation TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visits_annonce      ON visits(annonce_id);
CREATE INDEX idx_visits_demandeur    ON visits(demandeur_id);
CREATE INDEX idx_visits_proprietaire ON visits(proprietaire_id);
CREATE INDEX idx_visits_statut       ON visits(statut);
CREATE INDEX idx_visits_date         ON visits(date_visite);
```

---

## SeaORM Entities

Les entités peuvent être **générées** depuis la base après application des migrations (`immog-migrate up`) :

```bash
sea-orm-cli generate entity \
  -u "$IMMOG_DATABASE_URL" \
  -o rust-backend/src/db/entities \
  --with-serde both
```

Chaque enum PG natif est mappé en enum Rust via `DeriveActiveEnum`. Exemples représentatifs
(User, Listing, Contract) — les 8 autres suivent le même patron.

### Enums Rust (mapping des types PG natifs)

```rust
// rust-backend/src/db/entities/sea_orm_active_enums.rs (généré)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "badge")]
pub enum Badge {
    #[sea_orm(string_value = "BRONZE")]  Bronze,
    #[sea_orm(string_value = "ARGENT")]  Argent,
    #[sea_orm(string_value = "OR")]      Or,
    #[sea_orm(string_value = "DIAMANT")] Diamant,
}

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "statut_listing")]
pub enum StatutListing {
    #[sea_orm(string_value = "DISPONIBLE")]      Disponible,
    #[sea_orm(string_value = "EN_NEGOCIATION")]  EnNegociation,
    #[sea_orm(string_value = "LOUE_VENDU")]      LoueVendu,
    #[sea_orm(string_value = "EXPIRE")]          Expire,
    #[sea_orm(string_value = "ARCHIVE")]         Archive,
    #[sea_orm(string_value = "SUSPENDU")]        Suspendu,
}
// … idem pour les 20 autres enums (type_compte, statut_paiement, statut_contrat, …)
```

### User Entity

```rust
// rust-backend/src/db/entities/user.rs (généré, puis relations/scopes ajoutés)
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use super::sea_orm_active_enums::{Badge, StatutCompte, StatutVerification, TypeCompte};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(unique)]
    pub telephone: String,
    pub email: Option<String>,
    #[serde(skip_serializing)]                 // équivalent Eloquent $hidden
    pub mot_de_passe_hash: String,
    pub nom_complet: String,
    pub photo_profil_url: Option<String>,
    pub bio: Option<String>,
    pub type_compte: TypeCompte,
    pub badge_certification: Badge,
    pub statut_verification: StatutVerification,
    pub statut_compte: StatutCompte,
    pub note_moyenne: f32,
    pub nombre_transactions: i32,
    pub nombre_litiges: i32,
    pub preferences_notification: Json,        // {"push":bool,"sms":bool,"email":bool,"whatsapp":bool}
    pub date_inscription: DateTimeWithTimeZone,
    pub derniere_connexion: Option<DateTimeWithTimeZone>,
    pub date_suppression: Option<DateTimeWithTimeZone>,   // soft delete
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::listing::Entity")]
    Listings,
    #[sea_orm(has_many = "super::certification_document::Entity")]
    Certifications,
    // Contracts/Payments/Ratings/Transactions ont plusieurs FK vers users :
    // les liens landlord/tenant, payeur/beneficiaire, evaluateur/evalue se font
    // via des `Related`/`Linked` dédiés (voir impl ci-dessous) plutôt qu'une seule Relation.
}

impl Related<super::listing::Entity> for Entity {
    fn to() -> RelationDef { Relation::Listings.def() }
}

impl ActiveModelBehavior for ActiveModel {}
```

```rust
// rust-backend/src/db/entities/user_query.rs — scopes/accessors (remplacent scopes Eloquent)
use sea_orm::*;
use super::sea_orm_active_enums::{Badge, StatutCompte, StatutVerification};
use super::user::{Column, Entity, Model};

impl Entity {
    /// scopeActive : comptes actifs
    pub fn active() -> Select<Entity> {
        Entity::find().filter(Column::StatutCompte.eq(StatutCompte::Actif))
    }
    /// scopeByBadge
    pub fn by_badge(badge: Badge) -> Select<Entity> {
        Entity::find().filter(Column::BadgeCertification.eq(badge))
    }
    /// scopeHighRated (défaut 4.0)
    pub fn high_rated(min: f32) -> Select<Entity> {
        Entity::find().filter(Column::NoteMoyenne.gte(min))
    }
}

impl Model {
    /// accessor is_certified
    pub fn is_certified(&self) -> bool {
        matches!(
            self.statut_verification,
            StatutVerification::CniVerifiee | StatutVerification::TitreFoncierVerifie
        )
    }
}
```

> **Mot de passe** : le hachage se fait **explicitement** dans le service d'auth avec la crate `bcrypt`
> (à l'inscription et au changement de mot de passe ; vérification à la connexion). Voir
> `rust-backend/src/auth/`.

### Listing Entity (extrait — relations & scopes)

```rust
// rust-backend/src/db/entities/listing.rs (généré)
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "listings")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub createur_id: Uuid,
    pub type_operation: TypeOperation,
    pub type_bien: TypeBien,
    pub titre: String,
    pub description: String,
    pub prix_gnf: i64,                         // BIGINT
    pub quartier: Quartier,
    pub adresse_complete: Option<String>,
    pub superficie_m2: Option<i32>,
    pub nombre_chambres: Option<i32>,
    pub nombre_salons: Option<i32>,
    pub caution_mois: Option<i32>,
    pub equipements: Json,                      // array
    pub photos: Json,                           // array d'objets {original,large,medium,thumbnail}
    pub statut: StatutListing,
    pub nombre_vues: i32,
    pub options_premium: Json,
    pub date_publication: DateTimeWithTimeZone,
    pub date_derniere_maj: Option<DateTimeWithTimeZone>,
    pub date_expiration: DateTimeWithTimeZone,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}
```

```rust
// scopes Listing (remplacent scopeAvailable/byQuartier/byType/priceRange/fullTextSearch)
impl Entity {
    pub fn available() -> Select<Entity> {
        Entity::find()
            .filter(Column::Statut.eq(StatutListing::Disponible))
            .filter(Column::DateExpiration.gt(chrono::Utc::now()))
    }
    pub fn by_quartier(q: Quartier) -> Select<Entity> {
        Entity::find().filter(Column::Quartier.eq(q))
    }
    pub fn price_range(min: i64, max: i64) -> Select<Entity> {
        Entity::find().filter(Column::PrixGnf.between(min, max))
    }
    /// full-text search (GIN) — SQL brut car fonction PG spécifique
    pub fn full_text_search(term: &str) -> Select<Entity> {
        Entity::find().filter(Expr::cust_with_values(
            "to_tsvector('french', titre || ' ' || description) @@ plainto_tsquery('french', $1)",
            [term],
        ))
    }
}

impl Model {
    pub fn is_expired(&self) -> bool { self.date_expiration < chrono::Utc::now() }
}
```

### Contract Entity (extrait — accessors métier)

```rust
// scopes/accessors Contract (remplacent pendingSignature/fullySigned/isFullySigned/canRetract)
impl Entity {
    pub fn pending_signature() -> Select<Entity> {
        Entity::find().filter(
            Column::Statut.is_in([StatutContrat::EnAttenteSignature, StatutContrat::PartiellementSigne]),
        )
    }
    pub fn fully_signed() -> Select<Entity> {
        Entity::find().filter(Column::Statut.eq(StatutContrat::SigneArchive))
    }
}

impl Model {
    /// signatures est un JSON array ; parse puis compte
    pub fn is_fully_signed(&self) -> bool {
        self.signatures.as_array().map(|s| s.len() >= 2).unwrap_or(false)
    }
    pub fn can_retract(&self) -> bool {
        match self.delai_retractation_expire {
            Some(deadline) => chrono::Utc::now() < deadline,
            None => false,
        }
    }
}
```

Les entités **Payment, CertificationDocument, Rating, Conversation, Message, Dispute, Transaction,
Insurance** suivent exactement le même patron (`DeriveEntityModel` + enums `DeriveActiveEnum` + relations
`DeriveRelation` + scopes en `impl Entity`).

---

## Additional Indexes for Performance

```sql
-- rust-backend/src/db/migration/m20250128_000013_add_performance_indexes.rs (execute_unprepared)

-- Composite index for common listing searches (FR-094: <500ms)
CREATE INDEX idx_listings_search_composite
    ON listings(quartier, type_bien, prix_gnf, statut, date_publication DESC)
    WHERE statut = 'DISPONIBLE';

-- User rating filtering
CREATE INDEX idx_users_rating ON users(note_moyenne) WHERE note_moyenne >= 4.0;

-- Payment escrow queries (FR-043, FR-044)
CREATE INDEX idx_payments_escrow ON payments(statut, date_confirmation)
    WHERE statut IN ('EN_ESCROW', 'COMMISSION_COLLECTEE');

-- Contract signing status
CREATE INDEX idx_contracts_pending_signature ON contracts(statut, date_creation)
    WHERE statut IN ('EN_ATTENTE_SIGNATURE', 'PARTIELLEMENT_SIGNE');
```

`down()` : `DROP INDEX IF EXISTS` sur chacun (ordre inverse).

---

## Seeds Rust for Testing

Les factories Laravel (`UserFactory`, `ListingFactory`) sont remplacées par des **fonctions de fabrique**
Rust utilisant la crate `fake`, retournant des `ActiveModel` SeaORM.

### User seed factory

```rust
// rust-backend/src/db/seed/users.rs
use fake::{Fake, faker::{internet::fr_fr::SafeEmail, name::fr_fr::Name}};
use sea_orm::{ActiveValue::Set, ActiveModelTrait, DatabaseConnection};
use uuid::Uuid;
use crate::db::entities::{user, sea_orm_active_enums::*};

/// équivalent de UserFactory::definition()
pub fn user_factory() -> user::ActiveModel {
    let phone = format!("+2246{:08}", (10_000_000..99_999_999).fake::<u32>());
    user::ActiveModel {
        id: Set(Uuid::new_v4()),
        telephone: Set(phone),
        email: Set(Some(SafeEmail().fake())),
        mot_de_passe_hash: Set(bcrypt::hash("password", bcrypt::DEFAULT_COST).unwrap()),
        nom_complet: Set(Name().fake()),
        type_compte: Set([TypeCompte::Particulier, TypeCompte::Agence, TypeCompte::Diaspora].into_iter().nth((0..3).fake()).unwrap()),
        badge_certification: Set(Badge::Bronze),
        statut_verification: Set(StatutVerification::NonVerifie),
        statut_compte: Set(StatutCompte::Actif),
        note_moyenne: Set(0.0),
        nombre_transactions: Set(0),
        nombre_litiges: Set(0),
        ..Default::default()
    }
}

/// état "certified" (équivalent ->certified())
pub fn as_certified(mut m: user::ActiveModel) -> user::ActiveModel {
    m.badge_certification = Set(Badge::Or);
    m.statut_verification = Set(StatutVerification::TitreFoncierVerifie);
    m.note_moyenne = Set(4.5);
    m.nombre_transactions = Set(8);
    m
}

/// état "diamond"
pub fn as_diamond(mut m: user::ActiveModel) -> user::ActiveModel {
    m.badge_certification = Set(Badge::Diamant);
    m.statut_verification = Set(StatutVerification::TitreFoncierVerifie);
    m.note_moyenne = Set(4.8);
    m.nombre_transactions = Set(25);
    m
}
```

### Listing seed factory

```rust
// rust-backend/src/db/seed/listings.rs — équivalent ListingFactory
pub fn listing_factory(createur_id: Uuid) -> listing::ActiveModel {
    listing::ActiveModel {
        id: Set(Uuid::new_v4()),
        createur_id: Set(createur_id),
        type_operation: Set([TypeOperation::Location, TypeOperation::Vente][..].choose()),
        type_bien: Set([TypeBien::Villa, TypeBien::Appartement, TypeBien::Studio][..].choose()),
        titre: Set(Sentence(6..7).fake()),
        description: Set(Paragraph(3..4).fake()),
        prix_gnf: Set((1_000_000..10_000_000).fake()),
        quartier: Set([Quartier::Kaloum, Quartier::Dixinn, Quartier::Ratoma, Quartier::Matam][..].choose()),
        nombre_chambres: Set(Some((1..5).fake())),
        nombre_salons: Set(Some((1..2).fake())),
        caution_mois: Set(Some(3)),
        equipements: Set(json!(["Climatisation", "Eau courante", "Électricité"])),
        photos: Set(json!([])),
        statut: Set(StatutListing::Disponible),
        nombre_vues: Set((0..500).fake()),
        date_expiration: Set((chrono::Utc::now() + chrono::Duration::days(90)).into()),
        ..Default::default()
    }
}
```

---

## Seeder (binaire `immog-seed`)

```rust
// rust-backend/src/bin/seed.rs — remplace DatabaseSeeder
use sea_orm::{ActiveModelTrait, ActiveValue::Set, Database};
use immog_backend::db::{entities::*, seed::{users::*, listings::*}};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let db = Database::connect(std::env::var("IMMOG_DATABASE_URL")?).await?;

    // Admin
    let mut admin = user_factory();
    admin.telephone = Set("+224622000000".into());
    admin.email = Set(Some("admin@immoguinee.com".into()));
    admin.mot_de_passe_hash = Set(bcrypt::hash("admin123", bcrypt::DEFAULT_COST)?);
    admin.nom_complet = Set("Admin ImmoGuinée".into());
    admin.badge_certification = Set(sea_orm_active_enums::Badge::Diamant);
    admin.statut_verification = Set(sea_orm_active_enums::StatutVerification::TitreFoncierVerifie);
    admin.note_moyenne = Set(5.0);
    admin.nombre_transactions = Set(50);
    admin.insert(&db).await?;

    // 5 propriétaires certifiés + 4 annonces chacun
    for _ in 0..5 {
        let landlord = as_certified(user_factory()).insert(&db).await?;
        for _ in 0..4 {
            listing_factory(landlord.id).insert(&db).await?;
        }
    }

    // 10 annonces premium
    for _ in 0..10 {
        let owner = user_factory().insert(&db).await?;
        let mut l = listing_factory(owner.id);
        l.options_premium = Set(serde_json::json!({"badge_urgent":true,"remontee_48h":true,"photos_pro":true}));
        l.insert(&db).await?;
    }

    tracing::info!("Database seeded successfully!");
    Ok(())
}
```

---

## Migrations Strategy

### Development

```bash
# Appliquer toutes les migrations (enums + tables) — source de vérité du schéma
cargo run --bin immog-migrate -- up

# (Optionnel) régénérer les entités depuis la base après migrations
sea-orm-cli generate entity -u "$IMMOG_DATABASE_URL" -o rust-backend/src/db/entities --with-serde both

# Seeder la base avec des données de test
cargo run --bin immog-seed

# Réinitialiser (drop + up) puis seed
cargo run --bin immog-migrate -- fresh && cargo run --bin immog-seed
```

### Créer une nouvelle migration

```bash
# Générer un squelette de migration horodaté
sea-orm-cli migrate generate add_whatsapp_number_to_users
```

### Production Deployment

```bash
# Appliquer les migrations en production
cargo run --bin immog-migrate -- up

# Statut des migrations
cargo run --bin immog-migrate -- status
```

> ⚠️ Les migrations `sea-orm-migration` sont l'**unique source de vérité** du schéma. Aucune migration
> destructive en production sans le mot `deploy`.

---

## Database Performance Tuning

### Materialized View for Popular Listings (FR-095)

```sql
-- rust-backend/src/db/migration/m20250128_000014_create_popular_listings_view.rs (execute_unprepared)
CREATE MATERIALIZED VIEW popular_listings AS
    SELECT l.*, u.badge_certification, u.note_moyenne
    FROM listings l
    JOIN users u ON l.createur_id = u.id
    WHERE l.statut = 'DISPONIBLE' AND l.nombre_vues > 100
    ORDER BY l.nombre_vues DESC
    LIMIT 100;

CREATE UNIQUE INDEX popular_listings_id_idx ON popular_listings(id);
-- down(): DROP MATERIALIZED VIEW IF EXISTS popular_listings;
```

**Refresh job** (apalis + tokio-cron-scheduler, remplace la commande Artisan) :

```rust
// rust-backend/src/jobs/refresh_popular_listings.rs
use sea_orm::{ConnectionTrait, DatabaseConnection, Statement, DbBackend};

/// exécuté toutes les 10 minutes par le scheduler (voir src/jobs/mod.rs)
pub async fn refresh_popular_listings(db: &DatabaseConnection) -> anyhow::Result<()> {
    db.execute(Statement::from_string(
        DbBackend::Postgres,
        "REFRESH MATERIALIZED VIEW CONCURRENTLY popular_listings".to_owned(),
    ))
    .await?;
    tracing::info!("Popular listings view refreshed!");
    Ok(())
}
```

```rust
// rust-backend/src/jobs/mod.rs — planification (remplace app/Console/Kernel.php)
sched.add(Job::new_async("0 */10 * * * *", move |_, _| {
    let db = db.clone();
    Box::pin(async move { let _ = refresh_popular_listings(&db).await; })
})?)?;
```

---

## Table Partitioning (When > 500K Listings - FR-097)

```sql
-- rust-backend/src/db/migration/m20250601_000001_create_listings_partitioned.rs (execute_unprepared)
CREATE TABLE listings_partitioned (LIKE listings INCLUDING ALL) PARTITION BY LIST (quartier);

CREATE TABLE listings_kaloum  PARTITION OF listings_partitioned FOR VALUES IN ('KALOUM');
CREATE TABLE listings_dixinn  PARTITION OF listings_partitioned FOR VALUES IN ('DIXINN');
CREATE TABLE listings_ratoma  PARTITION OF listings_partitioned FOR VALUES IN ('RATOMA');
CREATE TABLE listings_matam   PARTITION OF listings_partitioned FOR VALUES IN ('MATAM');
CREATE TABLE listings_matoto  PARTITION OF listings_partitioned FOR VALUES IN ('MATOTO');

-- Migration des données puis renommage
INSERT INTO listings_partitioned SELECT * FROM listings;
ALTER TABLE listings RENAME TO listings_old;
ALTER TABLE listings_partitioned RENAME TO listings;
```

---

## Data Model Completeness Checklist

- [x] All 12 entities modeled (User, Listing, Visit, Contract, Payment, Certification, Rating, Conversation, Message, Dispute, Transaction, Insurance)
- [x] All 12 enums defined as PostgreSQL native types with correct values from FR specs (mappés en Rust via `DeriveActiveEnum`)
- [x] Foreign key relations with proper ON DELETE behaviors (CASCADE, RESTRICT, SET NULL)
- [x] All mandatory fields from FR-001 to FR-098 included
- [x] JSONB fields for flexible data (equipements, photos, signatures, etc.) — typés `Json` / `serde_json::Value`
- [x] Proper indexes for search performance (FR-094 <500ms target)
- [x] Unique constraints (telephone, hash_sha256, reference, etc.)
- [x] BIGINT for GNF amounts (`i64`, up to 999 billion GNF supported)
- [x] Timestamps with timezone support (`TIMESTAMPTZ` / `DateTimeWithTimeZone`)
- [x] Soft delete support (date_suppression, statut_compte = SUPPRIME)
- [x] SeaORM entities with relations, scopes (`impl Entity`), accessors (`impl Model`)
- [x] Seed factory functions (`fake`) for testing and seeding
- [x] Seeder binary (`immog-seed`) with admin user and test data
- [x] Schema owned by Rust `sea-orm-migration` (source de vérité unique)

**Status**: ✅ Data model complete with SeaORM/PostgreSQL. Ready for implementation.

**Next Steps**: Rewrite API contracts in `contracts/` directory for Axum routes (Phase 1). Appliquer les
migrations (`immog-migrate up`), puis (optionnel) générer les entités avec `sea-orm-cli generate entity`.
