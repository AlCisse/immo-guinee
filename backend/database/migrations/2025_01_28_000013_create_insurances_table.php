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
        Schema::create('insurances', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign keys
            $table->uuid('contract_id');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('cascade');

            $table->uuid('assure_id'); // User insured (usually tenant)
            $table->foreign('assure_id')->references('id')->on('users')->onDelete('cascade');

            // Insurance details (FR-077, FR-078)
            $table->string('numero_police', 100)->unique(); // Insurance policy number
            $table->string('assureur', 255); // Insurance company name
            $table->string('type_assurance', 100); // Type: "HABITATION", "RESPONSABILITE_CIVILE", etc.

            // Coverage
            $table->decimal('montant_couverture', 12, 2); // Coverage amount
            $table->json('garanties')->nullable(); // Covered items/risks
            $table->decimal('franchise', 12, 2)->nullable(); // Deductible

            // Premium
            $table->decimal('prime_annuelle', 12, 2);
            $table->decimal('prime_mensuelle', 12, 2)->nullable();

            // Validity
            $table->date('date_debut');
            $table->date('date_fin');
            $table->boolean('is_active')->default(true);

            // Documents
            $table->string('attestation_url')->nullable(); // Insurance certificate URL
            $table->string('contrat_url')->nullable(); // Full contract URL

            // Renewal
            $table->boolean('auto_renewal')->default(false);
            $table->timestamp('renewed_at')->nullable();

            // Claims (FR-079)
            $table->boolean('has_claims')->default(false);
            $table->integer('claims_count')->default(0);
            $table->json('claims_data')->nullable(); // Array of claim details

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('contract_id');
            $table->index('assure_id');
            $table->index('numero_police');
            $table->index('is_active');
            $table->index(['date_debut', 'date_fin']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('insurances');
    }
};
