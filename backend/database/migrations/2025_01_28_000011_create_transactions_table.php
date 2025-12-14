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
        Schema::create('transactions', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign keys
            $table->uuid('contract_id');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('cascade');

            $table->uuid('listing_id');
            $table->foreign('listing_id')->references('id')->on('listings')->onDelete('cascade');

            $table->uuid('bailleur_id');
            $table->foreign('bailleur_id')->references('id')->on('users')->onDelete('cascade');

            $table->uuid('locataire_id');
            $table->foreign('locataire_id')->references('id')->on('users')->onDelete('cascade');

            // Transaction reference
            $table->string('reference_transaction', 50)->unique();

            // Transaction details
            $table->decimal('montant_total', 12, 2);
            $table->decimal('commission_plateforme', 12, 2);
            $table->date('date_transaction');

            // Status (for badge calculation)
            $table->enum('statut', ['EN_ATTENTE', 'VALIDE', 'ANNULE'])->default('VALIDE');

            // Success flags (for badge calculation FR-053)
            $table->boolean('is_completed')->default(true); // Transaction completed successfully
            $table->boolean('has_dispute')->default(false); // Had a dispute
            $table->boolean('dispute_resolved')->default(false); // Dispute was resolved

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('contract_id');
            $table->index('listing_id');
            $table->index('bailleur_id');
            $table->index('locataire_id');
            $table->index('reference_transaction');
            $table->index('statut');
            $table->index('date_transaction');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
