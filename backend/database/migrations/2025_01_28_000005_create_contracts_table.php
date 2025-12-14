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
        Schema::create('contracts', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign keys
            $table->uuid('listing_id');
            $table->foreign('listing_id')->references('id')->on('listings')->onDelete('cascade');

            $table->uuid('bailleur_id'); // Owner/Landlord
            $table->foreign('bailleur_id')->references('id')->on('users')->onDelete('cascade');

            $table->uuid('locataire_id'); // Tenant
            $table->foreign('locataire_id')->references('id')->on('users')->onDelete('cascade');

            // Contract number (FR-023)
            $table->string('numero_contrat', 50)->unique(); // Format: IMMOG-2025-XXXXX

            // Contract details (FR-021, FR-024)
            $table->decimal('loyer_mensuel', 12, 2);
            $table->decimal('caution', 12, 2);
            $table->integer('duree_mois')->default(12); // Contract duration in months
            $table->date('date_debut');
            $table->date('date_fin');

            // Contract terms (FR-024)
            $table->text('clauses_specifiques')->nullable(); // Specific terms
            $table->json('termes_standards')->nullable(); // Standard terms from template

            // PDF Generation (FR-022, FR-025)
            $table->string('pdf_url')->nullable(); // S3/MinIO URL to generated PDF
            $table->string('pdf_hash')->nullable(); // SHA256 hash for integrity verification

            // Status (FR-026)
            $table->enum('statut', [
                'BROUILLON',
                'EN_ATTENTE_SIGNATURE_LOCATAIRE',
                'EN_ATTENTE_SIGNATURE_BAILLEUR',
                'SIGNE',
                'ACTIF',
                'TERMINE',
                'ANNULE'
            ])->default('BROUILLON');

            // E-Signatures (FR-027, FR-028, FR-029)
            // Bailleur signature
            $table->timestamp('bailleur_signed_at')->nullable();
            $table->string('bailleur_signature_otp')->nullable(); // OTP used for signature
            $table->string('bailleur_signature_ip')->nullable();
            $table->text('bailleur_signature_data')->nullable(); // JSON: {method: 'OTP_SMS', timestamp, device_info}

            // Locataire signature
            $table->timestamp('locataire_signed_at')->nullable();
            $table->string('locataire_signature_otp')->nullable();
            $table->string('locataire_signature_ip')->nullable();
            $table->text('locataire_signature_data')->nullable();

            // Digital seal (FR-030)
            $table->string('cachet_electronique')->nullable(); // Digital seal/watermark hash
            $table->timestamp('cachet_applied_at')->nullable();

            // Immutability (FR-032)
            $table->boolean('is_locked')->default(false); // Once signed, becomes immutable
            $table->timestamp('locked_at')->nullable();
            $table->string('blockchain_hash')->nullable(); // Optional: blockchain proof

            // Archive (FR-032 - 10 years retention)
            $table->boolean('is_archived')->default(false);
            $table->timestamp('archived_at')->nullable();
            $table->timestamp('scheduled_deletion_at')->nullable(); // After 10 years

            // Payment reference (foreign key added later in payments migration)
            $table->uuid('initial_payment_id')->nullable(); // Link to first caution payment

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('listing_id');
            $table->index('bailleur_id');
            $table->index('locataire_id');
            $table->index('numero_contrat');
            $table->index('statut');
            $table->index(['date_debut', 'date_fin']);
            $table->index('is_locked');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
