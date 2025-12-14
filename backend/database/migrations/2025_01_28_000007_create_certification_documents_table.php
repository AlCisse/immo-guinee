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
        Schema::create('certification_documents', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign keys
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            // Document type (FR-054)
            $table->enum('type_document', ['CNI', 'TITRE_FONCIER', 'AUTRES']);

            // Document details
            $table->string('numero_document', 100)->nullable(); // CNI number or titre foncier number
            $table->date('date_emission')->nullable();
            $table->date('date_expiration')->nullable();

            // File upload (FR-054)
            $table->string('fichier_url'); // S3/MinIO URL to uploaded document
            $table->string('fichier_hash')->nullable(); // SHA256 hash for integrity
            $table->integer('fichier_size')->nullable(); // File size in bytes
            $table->string('fichier_mime_type', 100)->nullable();

            // Verification status (FR-054, FR-055)
            $table->enum('statut_verification', ['EN_ATTENTE', 'VERIFIE', 'REJETE'])->default('EN_ATTENTE');

            // Admin verification
            $table->uuid('verified_by')->nullable(); // Admin who verified
            $table->foreign('verified_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('verified_at')->nullable();
            $table->text('verification_notes')->nullable(); // Admin notes
            $table->text('raison_rejet')->nullable();

            // OCR/AI verification (optional future feature)
            $table->json('ai_verification_data')->nullable(); // Automated checks results
            $table->decimal('ai_confidence_score', 5, 2)->nullable(); // 0.00 to 100.00

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('user_id');
            $table->index('type_document');
            $table->index('statut_verification');
            $table->index('verified_by');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('certification_documents');
    }
};
