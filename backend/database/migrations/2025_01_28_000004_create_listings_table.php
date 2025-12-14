<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('listings', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign keys
            $table->uuid('user_id'); // Bailleur/Owner
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            // Basic information (FR-007, FR-008, FR-011)
            $table->string('titre', 255); // FR-011
            $table->text('description'); // FR-011
            $table->enum('type_bien', ['STUDIO', 'CHAMBRE_SALON', 'APPARTEMENT_2CH', 'APPARTEMENT_3CH', 'VILLA', 'DUPLEX', 'BUREAU']);

            // Location (FR-008)
            $table->string('quartier', 100); // Predefined quartiers
            $table->string('commune', 100)->nullable();
            $table->text('adresse_complete')->nullable();

            // Geospatial (PostGIS) - FR-017
            // Will be added via raw SQL after table creation
            // $table->geography('location', 'POINT')->nullable();

            // Price (FR-011)
            $table->decimal('loyer_mensuel', 12, 2); // GNF (Guinean Franc)
            $table->decimal('caution', 12, 2); // Usually 2-3 months rent (FR-036)

            // Property details (FR-011)
            $table->integer('nombre_chambres')->nullable();
            $table->integer('nombre_salles_bain')->nullable();
            $table->integer('surface_m2')->nullable();
            $table->boolean('meuble')->default(false);

            // Amenities (JSON) - FR-011
            $table->json('commodites')->nullable(); // {climatisation: true, parking: true, jardin: false, etc.}

            // Photos (FR-009, FR-010)
            $table->json('photos')->nullable(); // Array of S3/MinIO URLs (max 10)
            $table->string('photo_principale')->nullable(); // URL to main photo

            // Status (FR-012, FR-015)
            $table->enum('statut', ['BROUILLON', 'EN_ATTENTE', 'ACTIVE', 'SUSPENDUE', 'EXPIREE', 'ARCHIVEE'])->default('EN_ATTENTE');
            $table->text('raison_suspension')->nullable();

            // Availability
            $table->boolean('disponible')->default(true);
            $table->date('date_disponibilite')->nullable();

            // Duration & expiration (FR-013)
            $table->timestamp('publie_at')->nullable();
            $table->timestamp('expire_at')->nullable(); // 30 days after publication
            $table->integer('renouvellements_count')->default(0);

            // Views & engagement (FR-020)
            $table->integer('vues_count')->default(0);
            $table->integer('favoris_count')->default(0);
            $table->integer('contacts_count')->default(0);

            // Moderation (FR-081, FR-082)
            $table->uuid('moderated_by')->nullable();
            $table->foreign('moderated_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('moderated_at')->nullable();

            // SEO & Search
            $table->string('slug')->unique()->nullable();
            $table->json('searchable_keywords')->nullable(); // For Elasticsearch

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('user_id');
            $table->index('type_bien');
            $table->index('quartier');
            $table->index('statut');
            $table->index('disponible');
            $table->index('loyer_mensuel');
            $table->index(['publie_at', 'expire_at']);
            $table->index('created_at');
        });

        // Add PostGIS geometry column
        DB::statement('ALTER TABLE listings ADD COLUMN location geography(POINT, 4326)');

        // Create spatial index on location
        DB::statement('CREATE INDEX listings_location_idx ON listings USING GIST (location)');

        // Create full-text search index (PostgreSQL)
        DB::statement('CREATE INDEX listings_fulltext_idx ON listings USING GIN (to_tsvector(\'french\', titre || \' \' || description))');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('listings');
    }
};
