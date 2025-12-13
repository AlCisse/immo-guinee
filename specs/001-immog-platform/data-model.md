# Data Model: ImmoGuinée Platform

**Feature**: ImmoGuinée - Plateforme Immobilière pour la Guinée
**Branch**: `001-immog-platform`
**Date**: 2025-01-28
**Phase**: 1 (Design)

---

## Overview

This document defines the complete database schema for ImmoGuinée using **Laravel 11 Eloquent ORM** with **PostgreSQL 15+**. The schema implements all 11 key entities from the feature specification with proper relations, constraints, and indexes for performance.

**Total Entities**: 11
**Total Enums**: 12
**Estimated Tables**: 11 core + 3 junction tables (many-to-many)
**Indexes Strategy**: 25+ indexes for search, filtering, and performance (FR-094: <500ms search)

**ORM**: Laravel Eloquent (Active Record pattern)
**Migration System**: Laravel Database Migrations
**Seeding**: Laravel Factories + DatabaseSeeder

---

## Entity Relationship Diagram (ERD)

```
User (Utilisateur)
 │
 ├──< Listing (Annonce) [1:N]
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

Laravel 11 supports PostgreSQL native enums. Define them in migrations:

```php
// database/migrations/2025_01_28_000001_create_enums.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Badge enum
        DB::statement("CREATE TYPE badge AS ENUM ('BRONZE', 'ARGENT', 'OR', 'DIAMANT')");

        // TypeCompte enum
        DB::statement("CREATE TYPE type_compte AS ENUM ('PARTICULIER', 'AGENCE', 'DIASPORA')");

        // StatutVerification enum
        DB::statement("CREATE TYPE statut_verification AS ENUM ('NON_VERIFIE', 'CNI_VERIFIEE', 'TITRE_FONCIER_VERIFIE')");

        // StatutCompte enum
        DB::statement("CREATE TYPE statut_compte AS ENUM ('ACTIF', 'SUSPENDU', 'BANNI', 'SUPPRIME')");

        // TypeOperation enum
        DB::statement("CREATE TYPE type_operation AS ENUM ('LOCATION', 'VENTE')");

        // TypeBien enum
        DB::statement("CREATE TYPE type_bien AS ENUM ('VILLA', 'APPARTEMENT', 'STUDIO', 'TERRAIN', 'COMMERCE', 'BUREAU', 'ENTREPOT')");

        // Quartier enum
        DB::statement("CREATE TYPE quartier AS ENUM ('KALOUM', 'DIXINN', 'RATOMA', 'MATAM', 'MATOTO', 'DUBREKA_CENTRE', 'DUBREKA_PERIPHERIE', 'COYAH_CENTRE', 'COYAH_PERIPHERIE')");

        // StatutListing enum
        DB::statement("CREATE TYPE statut_listing AS ENUM ('DISPONIBLE', 'EN_NEGOCIATION', 'LOUE_VENDU', 'EXPIRE', 'ARCHIVE', 'SUSPENDU')");

        // TypeContrat enum
        DB::statement("CREATE TYPE type_contrat AS ENUM ('BAIL_LOCATION_RESIDENTIEL', 'BAIL_LOCATION_COMMERCIAL', 'PROMESSE_VENTE_TERRAIN', 'MANDAT_GESTION', 'ATTESTATION_CAUTION')");

        // StatutContrat enum
        DB::statement("CREATE TYPE statut_contrat AS ENUM ('BROUILLON', 'EN_ATTENTE_SIGNATURE', 'PARTIELLEMENT_SIGNE', 'SIGNE_ARCHIVE', 'ANNULE')");

        // TypePaiement enum
        DB::statement("CREATE TYPE type_paiement AS ENUM ('CAUTION', 'LOYER_MENSUEL', 'COMMISSION_PLATEFORME', 'VENTE', 'FRAIS_PREMIUM')");

        // MethodePaiement enum
        DB::statement("CREATE TYPE methode_paiement AS ENUM ('ORANGE_MONEY', 'MTN_MOMO', 'ESPECES', 'VIREMENT_BANCAIRE')");

        // StatutPaiement enum
        DB::statement("CREATE TYPE statut_paiement AS ENUM ('INITIE', 'EN_ATTENTE_OTP', 'EN_ESCROW', 'COMMISSION_COLLECTEE', 'CONFIRME', 'ECHOUE', 'REMBOURSE')");

        // TypeDocument enum
        DB::statement("CREATE TYPE type_document AS ENUM ('CNI', 'TITRE_FONCIER', 'PASSEPORT')");

        // StatutVerificationDoc enum
        DB::statement("CREATE TYPE statut_verification_doc AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE')");

        // TypeMessage enum
        DB::statement("CREATE TYPE type_message AS ENUM ('TEXTE', 'VOCAL', 'PHOTO', 'LOCALISATION_GPS')");

        // StatutLecture enum
        DB::statement("CREATE TYPE statut_lecture AS ENUM ('ENVOYE', 'LIVRE', 'LU')");

        // StatutConversation enum
        DB::statement("CREATE TYPE statut_conversation AS ENUM ('ACTIVE', 'ARCHIVEE')");

        // TypeLitige enum
        DB::statement("CREATE TYPE type_litige AS ENUM ('IMPAYE', 'DEGATS', 'EXPULSION_ABUSIVE', 'CAUTION_NON_REMBOURSEE', 'AUTRE')");

        // StatutLitige enum
        DB::statement("CREATE TYPE statut_litige AS ENUM ('OUVERT', 'EN_COURS', 'RESOLU_AMIABLE', 'RESOLU_COMPENSATION', 'ECHOUE_ESCALADE')");

        // TypeAssurance enum
        DB::statement("CREATE TYPE type_assurance AS ENUM ('SEJOUR_SEREIN', 'LOYER_GARANTI')");

        // StatutAssurance enum
        DB::statement("CREATE TYPE statut_assurance AS ENUM ('ACTIVE', 'RESILIEE', 'SUSPENDUE')");

        // StatutTransaction enum
        DB::statement("CREATE TYPE statut_transaction AS ENUM ('EN_COURS', 'COMPLETEE', 'ANNULEE')");
    }

    public function down(): void
    {
        DB::statement("DROP TYPE IF EXISTS statut_transaction");
        DB::statement("DROP TYPE IF EXISTS statut_assurance");
        DB::statement("DROP TYPE IF EXISTS type_assurance");
        DB::statement("DROP TYPE IF EXISTS statut_litige");
        DB::statement("DROP TYPE IF EXISTS type_litige");
        DB::statement("DROP TYPE IF EXISTS statut_conversation");
        DB::statement("DROP TYPE IF EXISTS statut_lecture");
        DB::statement("DROP TYPE IF EXISTS type_message");
        DB::statement("DROP TYPE IF EXISTS statut_verification_doc");
        DB::statement("DROP TYPE IF EXISTS type_document");
        DB::statement("DROP TYPE IF EXISTS statut_paiement");
        DB::statement("DROP TYPE IF EXISTS methode_paiement");
        DB::statement("DROP TYPE IF EXISTS type_paiement");
        DB::statement("DROP TYPE IF EXISTS statut_contrat");
        DB::statement("DROP TYPE IF EXISTS type_contrat");
        DB::statement("DROP TYPE IF EXISTS statut_listing");
        DB::statement("DROP TYPE IF EXISTS quartier");
        DB::statement("DROP TYPE IF EXISTS type_bien");
        DB::statement("DROP TYPE IF EXISTS type_operation");
        DB::statement("DROP TYPE IF EXISTS statut_compte");
        DB::statement("DROP TYPE IF EXISTS statut_verification");
        DB::statement("DROP TYPE IF EXISTS type_compte");
        DB::statement("DROP TYPE IF EXISTS badge");
    }
};
```

---

## Laravel Migrations

### 1. Users Table

```php
// database/migrations/2025_01_28_000002_create_users_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Authentication
            $table->string('telephone', 20)->unique();  // +224 6XX XXX XXX
            $table->string('email', 255)->nullable();
            $table->string('mot_de_passe_hash', 255);

            // Profile
            $table->string('nom_complet', 255);
            $table->text('photo_profil_url')->nullable();
            $table->string('bio', 500)->nullable();

            // Type & Status (PostgreSQL enums)
            $table->addColumn('type_compte', 'type_compte')->default('PARTICULIER');
            $table->addColumn('badge_certification', 'badge')->default('BRONZE');
            $table->addColumn('statut_verification', 'statut_verification')->default('NON_VERIFIE');
            $table->addColumn('statut_compte', 'statut_compte')->default('ACTIF');

            // Metrics (calculated fields)
            $table->float('note_moyenne')->default(0);
            $table->integer('nombre_transactions')->default(0);
            $table->integer('nombre_litiges')->default(0);

            // Notifications Preferences (JSON)
            // Structure: { "push": true, "sms": true, "email": true, "whatsapp": false }
            $table->json('preferences_notification')->default(json_encode([
                'push' => true,
                'sms' => true,
                'email' => true,
                'whatsapp' => false
            ]));

            // Timestamps
            $table->timestampTz('date_inscription')->useCurrent();
            $table->timestampTz('derniere_connexion')->nullable();
            $table->timestampTz('date_suppression')->nullable();  // Soft delete
            $table->timestamps();

            // Indexes for performance
            $table->index('telephone');
            $table->index('badge_certification');
            $table->index('note_moyenne');
            $table->index('statut_compte');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
```

### 2. Listings Table

```php
// database/migrations/2025_01_28_000003_create_listings_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listings', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Owner
            $table->foreignUuid('createur_id')->constrained('users')->onDelete('cascade');

            // Basics (PostgreSQL enums)
            $table->addColumn('type_operation', 'type_operation');
            $table->addColumn('type_bien', 'type_bien');
            $table->string('titre', 100);
            $table->string('description', 2000);
            $table->bigInteger('prix_gnf');  // Use bigInteger for large GNF amounts

            // Location
            $table->addColumn('quartier', 'quartier');
            $table->string('adresse_complete', 500)->nullable();

            // Details
            $table->integer('superficie_m2')->nullable();  // For terrains/villas
            $table->integer('nombre_chambres')->nullable();
            $table->integer('nombre_salons')->nullable();
            $table->integer('caution_mois')->nullable();  // 1-6 months for locations (FR-012)

            // Equipements (JSON array)
            // Example: ["Climatisation", "Eau courante", "Électricité", "Internet"]
            $table->json('equipements')->nullable()->default(json_encode([]));

            // Photos (JSON array of S3 URLs)
            // Structure: [{ "original": "s3://...", "large": "s3://...", "medium": "s3://...", "thumbnail": "s3://..." }]
            $table->json('photos')->default(json_encode([]));

            // Status & Metrics
            $table->addColumn('statut', 'statut_listing')->default('DISPONIBLE');
            $table->integer('nombre_vues')->default(0);

            // Premium Options (JSON)
            // Structure: { "badge_urgent": false, "remontee_48h": false, "photos_pro": false }
            $table->json('options_premium')->default(json_encode([
                'badge_urgent' => false,
                'remontee_48h' => false,
                'photos_pro' => false
            ]));

            // Timestamps
            $table->timestampTz('date_publication')->useCurrent();
            $table->timestampTz('date_derniere_maj')->nullable();
            $table->timestampTz('date_expiration');  // publication + 90 days (FR-014)
            $table->timestamps();

            // Indexes for performance (FR-094: <500ms)
            $table->index(['quartier', 'statut']);
            $table->index(['type_bien', 'statut']);
            $table->index(['prix_gnf', 'statut']);
            $table->index('date_publication');
            $table->index('nombre_vues');
        });

        // Full-text search index (PostgreSQL GIN)
        DB::statement("CREATE INDEX listings_fulltext_idx ON listings USING GIN(to_tsvector('french', titre || ' ' || description))");
    }

    public function down(): void
    {
        Schema::dropIfExists('listings');
    }
};
```

### 3. Contracts Table

```php
// database/migrations/2025_01_28_000004_create_contracts_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contracts', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Type
            $table->addColumn('type_contrat', 'type_contrat');

            // Parties
            $table->foreignUuid('annonce_id')->nullable()->constrained('listings')->onDelete('set null');
            $table->foreignUuid('proprietaire_id')->constrained('users')->onDelete('restrict');
            $table->foreignUuid('locataire_acheteur_id')->constrained('users')->onDelete('restrict');

            // Contract Data (JSON - customizable per type)
            // Structure varies by type_contrat:
            // BAIL_LOCATION: { "duree_bail_mois": 12, "montant_loyer_gnf": 2500000, "montant_caution_gnf": 7500000, "date_debut": "2025-02-01", "clauses_specifiques": [] }
            // PROMESSE_VENTE: { "prix_vente_gnf": 500000000, "superficie_m2": 500, ... }
            $table->json('donnees_personnalisees');

            // Status & PDF
            $table->addColumn('statut', 'statut_contrat')->default('BROUILLON');
            $table->text('fichier_pdf_url')->nullable();  // S3 URL
            $table->string('hash_sha256', 64)->unique()->nullable();  // Integrity check (FR-030)

            // Signatures (JSON array)
            // Structure: [{ "user_id": "uuid", "nom": "string", "timestamp": "2025-01-28T14:30:00Z", "otp_valide": true }]
            $table->json('signatures')->default(json_encode([]));

            // Timestamps
            $table->timestampTz('date_creation')->useCurrent();
            $table->timestampTz('date_signature_complete')->nullable();
            $table->timestampTz('delai_retractation_expire')->nullable();  // signature_complete + 48h (FR-033)
            $table->timestamps();

            // Indexes
            $table->index('statut');
            $table->index('proprietaire_id');
            $table->index('locataire_acheteur_id');
            $table->index('date_creation');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
```

### 4. Payments Table

```php
// database/migrations/2025_01_28_000005_create_payments_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Parties
            $table->foreignUuid('payeur_id')->constrained('users')->onDelete('restrict');
            $table->foreignUuid('beneficiaire_id')->constrained('users')->onDelete('restrict');
            $table->foreignUuid('contrat_id')->nullable()->constrained('contracts')->onDelete('set null');

            // Payment Details
            $table->addColumn('type_paiement', 'type_paiement');
            $table->bigInteger('montant_gnf');
            $table->bigInteger('commission_plateforme_gnf')->default(0);  // FR-040: Calculated based on type
            $table->bigInteger('montant_total_gnf');  // montant + commission

            $table->addColumn('methode_paiement', 'methode_paiement');
            $table->addColumn('statut', 'statut_paiement')->default('INITIE');

            // External Transaction
            $table->string('numero_transaction_externe', 255)->nullable();  // Orange Money or MTN transaction ID

            // Quittance (Receipt PDF)
            $table->text('quittance_pdf_url')->nullable();  // S3 URL (FR-046)

            // Retry Logic (FR-051)
            $table->integer('tentatives_paiement')->default(0);  // Max 3 attempts

            // Timestamps
            $table->timestampTz('date_creation')->useCurrent();
            $table->timestampTz('date_confirmation')->nullable();  // Webhook received
            $table->timestampTz('date_validation_beneficiaire')->nullable();  // Landlord validated (FR-044)
            $table->timestampTz('date_deblocage_escrow')->nullable();  // Money released from escrow
            $table->timestamps();

            // Indexes
            $table->index('statut');
            $table->index('payeur_id');
            $table->index('beneficiaire_id');
            $table->index('contrat_id');
            $table->index('date_creation');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
```

### 5. Certification Documents Table

```php
// database/migrations/2025_01_28_000006_create_certification_documents_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certification_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // User
            $table->foreignUuid('utilisateur_id')->constrained('users')->onDelete('cascade');

            // Document Type
            $table->addColumn('type_document', 'type_document');

            // File
            $table->text('fichier_url');  // S3 URL (encrypted)

            // Verification
            $table->addColumn('statut_verification', 'statut_verification_doc')->default('EN_ATTENTE');
            $table->string('commentaire_verification', 500)->nullable();  // If rejected
            $table->uuid('verifie_par_admin_id')->nullable();

            // Timestamps
            $table->timestampTz('date_upload')->useCurrent();
            $table->timestampTz('date_verification')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('utilisateur_id');
            $table->index('statut_verification');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certification_documents');
    }
};
```

### 6. Ratings Table

```php
// database/migrations/2025_01_28_000007_create_ratings_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ratings', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Parties
            $table->foreignUuid('evaluateur_id')->constrained('users')->onDelete('cascade');
            $table->foreignUuid('evalue_id')->constrained('users')->onDelete('cascade');
            $table->foreignUuid('transaction_id')->unique()->constrained('transactions')->onDelete('cascade');

            // Rating (1-5 stars)
            $table->smallInteger('note_globale');  // Average of 3 criteria
            $table->smallInteger('critere_1_note');  // Varies by role (landlord vs tenant)
            $table->smallInteger('critere_2_note');
            $table->smallInteger('critere_3_note');

            // Comment
            $table->string('commentaire', 500);  // 20-500 chars (FR-068)

            // Moderation
            $table->addColumn('statut_moderation', 'statut_verification_doc')->default('EN_ATTENTE');
            $table->json('mots_cles_detectes')->nullable()->default(json_encode([]));  // Array of flagged keywords

            // Timestamps
            $table->timestampTz('date_creation')->useCurrent();
            $table->timestampTz('date_publication')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('evalue_id');
            $table->index('note_globale');
            $table->index('statut_moderation');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ratings');
    }
};
```

### 7. Conversations Table

```php
// database/migrations/2025_01_28_000008_create_conversations_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Listing Context
            $table->uuid('annonce_id')->nullable();

            // Participants
            $table->foreignUuid('participant_1_id')->constrained('users')->onDelete('cascade');
            $table->foreignUuid('participant_2_id')->constrained('users')->onDelete('cascade');

            // Privacy
            $table->boolean('numeros_partages')->default(false);  // FR-060: Phone numbers revealed after mutual consent

            // Status
            $table->addColumn('statut', 'statut_conversation')->default('ACTIVE');

            // Timestamps
            $table->timestampTz('date_creation')->useCurrent();
            $table->timestampTz('date_dernier_message')->nullable();
            $table->timestamps();

            // Unique constraint: One conversation per listing per pair
            $table->unique(['participant_1_id', 'participant_2_id', 'annonce_id']);

            // Indexes
            $table->index('participant_1_id');
            $table->index('participant_2_id');
            $table->index('date_dernier_message');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
```

### 8. Messages Table

```php
// database/migrations/2025_01_28_000009_create_messages_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Conversation
            $table->foreignUuid('conversation_id')->constrained('conversations')->onDelete('cascade');

            // Sender
            $table->foreignUuid('expediteur_id')->constrained('users')->onDelete('cascade');

            // Content
            $table->addColumn('type_message', 'type_message');
            $table->string('contenu_texte', 2000)->nullable();  // For TEXTE type
            $table->text('fichier_url')->nullable();  // For VOCAL/PHOTO types (S3 URL)
            $table->string('localisation_lat_lng', 50)->nullable();  // For LOCALISATION_GPS type (format: "lat,lng")

            // Status
            $table->timestampTz('horodatage')->useCurrent();
            $table->addColumn('statut_lecture', 'statut_lecture')->default('ENVOYE');

            // Moderation
            $table->boolean('signale')->default(false);
            $table->string('raison_signalement', 255)->nullable();

            $table->timestamps();

            // Indexes
            $table->index(['conversation_id', 'horodatage']);
            $table->index('expediteur_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
```

### 9. Disputes Table

```php
// database/migrations/2025_01_28_000010_create_disputes_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('disputes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference', 20)->unique();  // e.g., "LIT-1234"

            // Transaction Context
            $table->foreignUuid('transaction_id')->nullable()->constrained('transactions')->onDelete('set null');

            // Parties
            $table->foreignUuid('demandeur_id')->constrained('users')->onDelete('restrict');
            $table->foreignUuid('defendeur_id')->constrained('users')->onDelete('restrict');

            // Details
            $table->addColumn('type_litige', 'type_litige');
            $table->string('description', 2000);  // 200-2000 chars (FR-072)

            // Preuves (JSON array of S3 URLs)
            // Structure: [{ "type": "photo"|"document", "url": "s3://...", "nom_fichier": "file.jpg" }]
            $table->json('preuves_urls')->default(json_encode([]));

            // Status & Resolution
            $table->addColumn('statut', 'statut_litige')->default('OUVERT');
            $table->uuid('mediateur_assigne_id')->nullable();

            // Resolution (JSON)
            // Structure: { "issue": "amiable"|"compensation"|"echec", "montant_compensation_gnf": 1000000, "accord_parties": true, "notes": "..." }
            $table->json('resolution')->nullable();

            // Timestamps
            $table->timestampTz('date_ouverture')->useCurrent();
            $table->timestampTz('date_assignation_mediateur')->nullable();
            $table->timestampTz('date_resolution')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('statut');
            $table->index('demandeur_id');
            $table->index('defendeur_id');
            $table->index('date_ouverture');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('disputes');
    }
};
```

### 10. Transactions Table

```php
// database/migrations/2025_01_28_000011_create_transactions_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Listing Context
            $table->uuid('annonce_id')->nullable();

            // Parties
            $table->foreignUuid('proprietaire_id')->constrained('users')->onDelete('restrict');
            $table->foreignUuid('locataire_acheteur_id')->constrained('users')->onDelete('restrict');

            // Contract
            $table->foreignUuid('contrat_id')->unique()->constrained('contracts')->onDelete('restrict');

            // Payments (JSON array of payment IDs)
            // Structure: ["uuid1", "uuid2", ...]
            $table->json('paiements_ids')->default(json_encode([]));

            // Type & Amounts
            $table->addColumn('type_transaction', 'type_operation');  // LOCATION or VENTE
            $table->bigInteger('montant_total_gnf');
            $table->bigInteger('commission_plateforme_gnf');

            // Status
            $table->addColumn('statut', 'statut_transaction')->default('EN_COURS');

            // Timestamps
            $table->timestampTz('date_debut')->useCurrent();
            $table->timestampTz('date_completion')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('proprietaire_id');
            $table->index('locataire_acheteur_id');
            $table->index('statut');
            $table->index('date_completion');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
```

### 11. Insurances Table (Phase 2)

```php
// database/migrations/2025_01_28_000012_create_insurances_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('insurances', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // User
            $table->foreignUuid('utilisateur_id')->constrained('users')->onDelete('cascade');

            // Contract Context
            $table->foreignUuid('contrat_id')->unique()->constrained('contracts')->onDelete('restrict');

            // Insurance Details
            $table->addColumn('type_assurance', 'type_assurance');
            $table->string('numero_police', 50)->unique();  // e.g., "ASSUR-SS-1234"
            $table->integer('prime_mensuelle_gnf');

            // Couvertures (JSON)
            // Structure for SEJOUR_SEREIN: { "expulsion_abusive": true, "caution": true, "assistance_juridique": true }
            // Structure for LOYER_GARANTI: { "impayes": true, "degats_locatifs": true }
            $table->json('couvertures');

            // Plafonds (JSON)
            // Structure: { "expulsion": "3_mois_loyer", "degats": 1000000 }
            $table->json('plafonds');

            // Status
            $table->addColumn('statut', 'statut_assurance')->default('ACTIVE');

            // Timestamps
            $table->timestampTz('date_souscription')->useCurrent();
            $table->timestampTz('date_expiration');  // souscription + 1 year
            $table->timestamps();

            // Indexes
            $table->index('utilisateur_id');
            $table->index('statut');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('insurances');
    }
};
```

---

## Eloquent Model Examples

### User Model

```php
// app/Models/User.php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'telephone',
        'email',
        'mot_de_passe_hash',
        'nom_complet',
        'photo_profil_url',
        'bio',
        'type_compte',
        'badge_certification',
        'statut_verification',
        'statut_compte',
        'preferences_notification',
    ];

    protected $hidden = [
        'mot_de_passe_hash',
    ];

    protected $casts = [
        'preferences_notification' => 'array',
        'note_moyenne' => 'float',
        'date_inscription' => 'datetime',
        'derniere_connexion' => 'datetime',
        'date_suppression' => 'datetime',
    ];

    // Relationships
    public function listings()
    {
        return $this->hasMany(Listing::class, 'createur_id');
    }

    public function contractsAsLandlord()
    {
        return $this->hasMany(Contract::class, 'proprietaire_id');
    }

    public function contractsAsTenant()
    {
        return $this->hasMany(Contract::class, 'locataire_acheteur_id');
    }

    public function paymentsSent()
    {
        return $this->hasMany(Payment::class, 'payeur_id');
    }

    public function paymentsReceived()
    {
        return $this->hasMany(Payment::class, 'beneficiaire_id');
    }

    public function certifications()
    {
        return $this->hasMany(CertificationDocument::class, 'utilisateur_id');
    }

    public function ratingsGiven()
    {
        return $this->hasMany(Rating::class, 'evaluateur_id');
    }

    public function ratingsReceived()
    {
        return $this->hasMany(Rating::class, 'evalue_id');
    }

    public function transactionsAsLandlord()
    {
        return $this->hasMany(Transaction::class, 'proprietaire_id');
    }

    public function transactionsAsTenant()
    {
        return $this->hasMany(Transaction::class, 'locataire_acheteur_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('statut_compte', 'ACTIF');
    }

    public function scopeByBadge($query, $badge)
    {
        return $query->where('badge_certification', $badge);
    }

    public function scopeHighRated($query, $minRating = 4.0)
    {
        return $query->where('note_moyenne', '>=', $minRating);
    }

    // Accessors
    public function getIsCertifiedAttribute()
    {
        return in_array($this->statut_verification, ['CNI_VERIFIEE', 'TITRE_FONCIER_VERIFIE']);
    }

    // Mutators
    public function setMotDePasseHashAttribute($value)
    {
        $this->attributes['mot_de_passe_hash'] = bcrypt($value);
    }
}
```

### Listing Model

```php
// app/Models/Listing.php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Listing extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'createur_id',
        'type_operation',
        'type_bien',
        'titre',
        'description',
        'prix_gnf',
        'quartier',
        'adresse_complete',
        'superficie_m2',
        'nombre_chambres',
        'nombre_salons',
        'caution_mois',
        'equipements',
        'photos',
        'statut',
        'options_premium',
        'date_expiration',
    ];

    protected $casts = [
        'equipements' => 'array',
        'photos' => 'array',
        'options_premium' => 'array',
        'prix_gnf' => 'integer',
        'date_publication' => 'datetime',
        'date_derniere_maj' => 'datetime',
        'date_expiration' => 'datetime',
    ];

    // Relationships
    public function creator()
    {
        return $this->belongsTo(User::class, 'createur_id');
    }

    public function contracts()
    {
        return $this->hasMany(Contract::class, 'annonce_id');
    }

    // Scopes
    public function scopeAvailable($query)
    {
        return $query->where('statut', 'DISPONIBLE')
                     ->where('date_expiration', '>', now());
    }

    public function scopeByQuartier($query, $quartier)
    {
        return $query->where('quartier', $quartier);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type_bien', $type);
    }

    public function scopePriceRange($query, $min, $max)
    {
        return $query->whereBetween('prix_gnf', [$min, $max]);
    }

    public function scopeFullTextSearch($query, $searchTerm)
    {
        return $query->whereRaw(
            "to_tsvector('french', titre || ' ' || description) @@ plainto_tsquery('french', ?)",
            [$searchTerm]
        );
    }

    // Accessors
    public function getIsExpiredAttribute()
    {
        return $this->date_expiration < now();
    }

    public function getHasPremiumAttribute()
    {
        $options = $this->options_premium;
        return $options['badge_urgent'] || $options['remontee_48h'] || $options['photos_pro'];
    }
}
```

### Contract Model

```php
// app/Models/Contract.php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contract extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'type_contrat',
        'annonce_id',
        'proprietaire_id',
        'locataire_acheteur_id',
        'donnees_personnalisees',
        'statut',
        'fichier_pdf_url',
        'hash_sha256',
        'signatures',
        'date_signature_complete',
        'delai_retractation_expire',
    ];

    protected $casts = [
        'donnees_personnalisees' => 'array',
        'signatures' => 'array',
        'date_creation' => 'datetime',
        'date_signature_complete' => 'datetime',
        'delai_retractation_expire' => 'datetime',
    ];

    // Relationships
    public function listing()
    {
        return $this->belongsTo(Listing::class, 'annonce_id');
    }

    public function landlord()
    {
        return $this->belongsTo(User::class, 'proprietaire_id');
    }

    public function tenant()
    {
        return $this->belongsTo(User::class, 'locataire_acheteur_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'contrat_id');
    }

    public function transaction()
    {
        return $this->hasOne(Transaction::class, 'contrat_id');
    }

    public function insurance()
    {
        return $this->hasOne(Insurance::class, 'contrat_id');
    }

    // Scopes
    public function scopePendingSignature($query)
    {
        return $query->whereIn('statut', ['EN_ATTENTE_SIGNATURE', 'PARTIELLEMENT_SIGNE']);
    }

    public function scopeFullySigned($query)
    {
        return $query->where('statut', 'SIGNE_ARCHIVE');
    }

    // Accessors
    public function getIsFullySignedAttribute()
    {
        return count($this->signatures) >= 2;
    }

    public function getCanRetractAttribute()
    {
        if (!$this->delai_retractation_expire) {
            return false;
        }
        return now() < $this->delai_retractation_expire;
    }
}
```

---

## Additional Indexes for Performance

```php
// database/migrations/2025_01_28_000013_add_performance_indexes.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Composite index for common listing searches (FR-094: <500ms)
        DB::statement('CREATE INDEX idx_listings_search_composite ON listings(quartier, type_bien, prix_gnf, statut, date_publication DESC) WHERE statut = \'DISPONIBLE\'');

        // User rating filtering
        DB::statement('CREATE INDEX idx_users_rating ON users(note_moyenne) WHERE note_moyenne >= 4.0');

        // Payment escrow queries (FR-043, FR-044)
        DB::statement("CREATE INDEX idx_payments_escrow ON payments(statut, date_confirmation) WHERE statut IN ('EN_ESCROW', 'COMMISSION_COLLECTEE')");

        // Contract signing status
        DB::statement("CREATE INDEX idx_contracts_pending_signature ON contracts(statut, date_creation) WHERE statut IN ('EN_ATTENTE_SIGNATURE', 'PARTIELLEMENT_SIGNE')");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_contracts_pending_signature');
        DB::statement('DROP INDEX IF EXISTS idx_payments_escrow');
        DB::statement('DROP INDEX IF EXISTS idx_users_rating');
        DB::statement('DROP INDEX IF EXISTS idx_listings_search_composite');
    }
};
```

---

## Laravel Factories for Testing

### User Factory

```php
// database/factories/UserFactory.php
namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::uuid(),
            'telephone' => '+224' . $this->faker->numerify('6########'),
            'email' => $this->faker->unique()->safeEmail(),
            'mot_de_passe_hash' => bcrypt('password'),
            'nom_complet' => $this->faker->name(),
            'type_compte' => $this->faker->randomElement(['PARTICULIER', 'AGENCE', 'DIASPORA']),
            'badge_certification' => 'BRONZE',
            'statut_verification' => 'NON_VERIFIE',
            'statut_compte' => 'ACTIF',
            'note_moyenne' => 0,
            'nombre_transactions' => 0,
            'nombre_litiges' => 0,
        ];
    }

    public function certified(): static
    {
        return $this->state(fn (array $attributes) => [
            'badge_certification' => 'OR',
            'statut_verification' => 'TITRE_FONCIER_VERIFIE',
            'note_moyenne' => 4.5,
            'nombre_transactions' => 8,
        ]);
    }

    public function diamond(): static
    {
        return $this->state(fn (array $attributes) => [
            'badge_certification' => 'DIAMANT',
            'statut_verification' => 'TITRE_FONCIER_VERIFIE',
            'note_moyenne' => 4.8,
            'nombre_transactions' => 25,
        ]);
    }
}
```

### Listing Factory

```php
// database/factories/ListingFactory.php
namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ListingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::uuid(),
            'createur_id' => User::factory(),
            'type_operation' => $this->faker->randomElement(['LOCATION', 'VENTE']),
            'type_bien' => $this->faker->randomElement(['VILLA', 'APPARTEMENT', 'STUDIO']),
            'titre' => $this->faker->sentence(6),
            'description' => $this->faker->paragraph(3),
            'prix_gnf' => $this->faker->numberBetween(1000000, 10000000),
            'quartier' => $this->faker->randomElement(['KALOUM', 'DIXINN', 'RATOMA', 'MATAM']),
            'adresse_complete' => $this->faker->address(),
            'nombre_chambres' => $this->faker->numberBetween(1, 5),
            'nombre_salons' => $this->faker->numberBetween(1, 2),
            'caution_mois' => 3,
            'equipements' => ['Climatisation', 'Eau courante', 'Électricité'],
            'photos' => [],
            'statut' => 'DISPONIBLE',
            'nombre_vues' => $this->faker->numberBetween(0, 500),
            'date_expiration' => now()->addDays(90),
        ];
    }

    public function premium(): static
    {
        return $this->state(fn (array $attributes) => [
            'options_premium' => [
                'badge_urgent' => true,
                'remontee_48h' => true,
                'photos_pro' => true,
            ],
        ]);
    }
}
```

---

## DatabaseSeeder

```php
// database/seeders/DatabaseSeeder.php
namespace Database\Seeders;

use App\Models\User;
use App\Models\Listing;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create admin user
        $admin = User::create([
            'telephone' => '+224622000000',
            'email' => 'admin@immoguinee.com',
            'mot_de_passe_hash' => bcrypt('admin123'),
            'nom_complet' => 'Admin ImmoGuinée',
            'type_compte' => 'PARTICULIER',
            'badge_certification' => 'DIAMANT',
            'statut_verification' => 'TITRE_FONCIER_VERIFIE',
            'note_moyenne' => 5.0,
            'nombre_transactions' => 50,
        ]);

        // Create certified landlords
        $landlords = User::factory()
            ->count(5)
            ->certified()
            ->create();

        // Create listings for each landlord
        foreach ($landlords as $landlord) {
            Listing::factory()
                ->count(4)
                ->for($landlord, 'creator')
                ->create();
        }

        // Create premium listings
        Listing::factory()
            ->count(10)
            ->premium()
            ->create();

        $this->command->info('Database seeded successfully!');
    }
}
```

---

## Migrations Strategy

### Development

```bash
# Run all migrations (creates enums + tables)
php artisan migrate

# Seed database with test data
php artisan db:seed

# Reset and re-run migrations + seed
php artisan migrate:fresh --seed
```

### Creating New Migrations

```bash
# Add new field to users table
php artisan make:migration add_whatsapp_number_to_users_table

# Create new table
php artisan make:migration create_admin_logs_table
```

### Production Deployment

```bash
# Run migrations in production (no rollback!)
php artisan migrate --force

# Check migration status
php artisan migrate:status
```

---

## Database Performance Tuning

### Materialized View for Popular Listings (FR-095)

```php
// database/migrations/2025_01_28_000014_create_popular_listings_view.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('
            CREATE MATERIALIZED VIEW popular_listings AS
            SELECT l.*, u.badge_certification, u.note_moyenne
            FROM listings l
            JOIN users u ON l.createur_id = u.id
            WHERE l.statut = \'DISPONIBLE\' AND l.nombre_vues > 100
            ORDER BY l.nombre_vues DESC
            LIMIT 100
        ');

        DB::statement('CREATE UNIQUE INDEX popular_listings_id_idx ON popular_listings(id)');
    }

    public function down(): void
    {
        DB::statement('DROP MATERIALIZED VIEW IF EXISTS popular_listings');
    }
};
```

**Refresh Command** (run via Laravel Scheduler or n8n cron):
```php
// app/Console/Commands/RefreshPopularListings.php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RefreshPopularListings extends Command
{
    protected $signature = 'listings:refresh-popular';
    protected $description = 'Refresh popular listings materialized view';

    public function handle()
    {
        DB::statement('REFRESH MATERIALIZED VIEW CONCURRENTLY popular_listings');
        $this->info('Popular listings view refreshed!');
    }
}
```

**Schedule in `app/Console/Kernel.php`**:
```php
protected function schedule(Schedule $schedule)
{
    $schedule->command('listings:refresh-popular')->everyTenMinutes();
}
```

---

## Table Partitioning (When > 500K Listings - FR-097)

```php
// database/migrations/2025_06_01_create_listings_partitioned.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('
            CREATE TABLE listings_partitioned (LIKE listings INCLUDING ALL)
            PARTITION BY LIST (quartier)
        ');

        DB::statement('CREATE TABLE listings_kaloum PARTITION OF listings_partitioned FOR VALUES IN (\'KALOUM\')');
        DB::statement('CREATE TABLE listings_dixinn PARTITION OF listings_partitioned FOR VALUES IN (\'DIXINN\')');
        DB::statement('CREATE TABLE listings_ratoma PARTITION OF listings_partitioned FOR VALUES IN (\'RATOMA\')');
        DB::statement('CREATE TABLE listings_matam PARTITION OF listings_partitioned FOR VALUES IN (\'MATAM\')');
        DB::statement('CREATE TABLE listings_matoto PARTITION OF listings_partitioned FOR VALUES IN (\'MATOTO\')');

        // Migrate data from listings to listings_partitioned
        DB::statement('INSERT INTO listings_partitioned SELECT * FROM listings');

        // Rename tables
        DB::statement('ALTER TABLE listings RENAME TO listings_old');
        DB::statement('ALTER TABLE listings_partitioned RENAME TO listings');
    }
};
```

---

## Data Model Completeness Checklist

- [x] All 11 entities modeled (User, Listing, Contract, Payment, Certification, Rating, Conversation, Message, Dispute, Transaction, Insurance)
- [x] All 12 enums defined as PostgreSQL native types with correct values from FR specs
- [x] Foreign key relations with proper onDelete behaviors (cascade, restrict, set null)
- [x] All mandatory fields from FR-001 to FR-098 included
- [x] JSON fields for flexible data (equipements, photos, signatures, etc.)
- [x] Proper indexes for search performance (FR-094 <500ms target)
- [x] Unique constraints (telephone, hash_sha256, reference, etc.)
- [x] BigInteger for GNF amounts (up to 999 billion GNF supported)
- [x] Timestamps with timezone support (timestampTz)
- [x] Soft delete support (date_suppression, statut_compte = SUPPRIME)
- [x] Laravel Eloquent models with relationships, scopes, accessors/mutators
- [x] Factory classes for testing and seeding
- [x] Database seeder with admin user and test data

**Status**: ✅ Data model complete with Laravel Eloquent. Ready for implementation.

**Next Steps**: Rewrite API contracts in `contracts/` directory for Laravel routes (Phase 1).
