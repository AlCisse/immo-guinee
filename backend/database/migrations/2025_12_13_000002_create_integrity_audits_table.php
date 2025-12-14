<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Table d'audit d'intégrité pour les documents sensibles
     * Stocke les hash séparément pour vérification indépendante
     */
    public function up(): void
    {
        Schema::create('integrity_audits', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Entity reference
            $table->string('entity_type', 50); // 'contract', 'document', etc.
            $table->uuid('entity_id');
            $table->string('reference_number', 100)->nullable(); // Contract number, etc.

            // File location
            $table->string('file_path', 500);
            $table->string('storage_disk', 50);

            // Integrity hashes (stored separately from main entity for security)
            $table->string('original_hash', 64); // SHA-256 of decrypted content
            $table->string('encrypted_hash', 64); // SHA-256 of encrypted file
            $table->bigInteger('file_size');

            // Archive info
            $table->timestamp('archived_at');
            $table->timestamp('retention_until'); // Legal retention period

            // Parties involved (for contracts)
            $table->uuid('bailleur_id')->nullable();
            $table->uuid('locataire_id')->nullable();

            // Metadata
            $table->json('metadata')->nullable();

            // Verification tracking
            $table->timestamp('last_verified_at')->nullable();
            $table->integer('verification_count')->default(0);

            // Violation tracking
            $table->integer('integrity_violations')->default(0);
            $table->timestamp('last_violation_at')->nullable();
            $table->string('last_violation_type', 50)->nullable();

            $table->timestamps();

            // Indexes
            $table->index(['entity_type', 'entity_id']);
            $table->index('reference_number');
            $table->index('retention_until');
            $table->index('last_verified_at');
            $table->index('integrity_violations');
        });

        // Add secure archive fields to contracts table
        Schema::table('contracts', function (Blueprint $table) {
            $table->string('secure_archive_path', 500)->nullable()->after('pdf_encrypted');
            $table->string('secure_archive_disk', 50)->nullable()->after('secure_archive_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn(['secure_archive_path', 'secure_archive_disk']);
        });

        Schema::dropIfExists('integrity_audits');
    }
};
