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
        Schema::create('disputes', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign keys
            $table->uuid('contract_id');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('cascade');

            $table->uuid('plaignant_id'); // User who filed the dispute
            $table->foreign('plaignant_id')->references('id')->on('users')->onDelete('cascade');

            $table->uuid('defendeur_id'); // User being disputed
            $table->foreign('defendeur_id')->references('id')->on('users')->onDelete('cascade');

            // Dispute reference (FR-069)
            $table->string('reference_litige', 50)->unique(); // Format: LIT-2025-XXXXX

            // Dispute details (FR-067, FR-068)
            $table->string('motif', 255); // Main reason for dispute
            $table->text('description'); // Detailed description
            $table->json('preuves')->nullable(); // Evidence URLs (photos, documents)

            // Category
            $table->string('categorie', 100)->nullable(); // e.g., "Non-payment", "Property damage", etc.

            // Status (FR-069, FR-072, FR-074)
            $table->enum('statut', [
                'OUVERT',
                'EN_MEDIATION',
                'RESOLU_AMIABLE',
                'RESOLU_JUDICIAIRE',
                'FERME'
            ])->default('OUVERT');

            // Mediation (FR-073)
            $table->uuid('mediateur_id')->nullable(); // Admin assigned as mediator
            $table->foreign('mediateur_id')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('mediation_started_at')->nullable();
            $table->timestamp('mediation_ended_at')->nullable();

            // Resolution (FR-074, FR-075)
            $table->text('resolution_description')->nullable(); // How it was resolved
            $table->string('resolution_type', 100)->nullable(); // "AMIABLE", "JUDICIAIRE", "REFUND", etc.
            $table->decimal('montant_resolution', 12, 2)->nullable(); // Amount involved in resolution
            $table->timestamp('resolved_at')->nullable();

            // Closure
            $table->boolean('is_closed')->default(false);
            $table->timestamp('closed_at')->nullable();
            $table->text('closure_notes')->nullable();

            // Impact on users (FR-076)
            $table->boolean('affects_plaignant_rating')->default(false);
            $table->boolean('affects_defendeur_rating')->default(false);
            $table->boolean('affects_plaignant_badge')->default(false);
            $table->boolean('affects_defendeur_badge')->default(false);

            // Escalation to legal
            $table->boolean('escalated_to_legal')->default(false);
            $table->timestamp('legal_escalation_at')->nullable();
            $table->text('legal_case_number')->nullable();

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('contract_id');
            $table->index('plaignant_id');
            $table->index('defendeur_id');
            $table->index('mediateur_id');
            $table->index('reference_litige');
            $table->index('statut');
            $table->index('is_closed');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('disputes');
    }
};
