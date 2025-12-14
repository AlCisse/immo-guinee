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
        Schema::create('payments', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign keys
            $table->uuid('contract_id');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('cascade');

            $table->uuid('payeur_id'); // User making payment (usually tenant)
            $table->foreign('payeur_id')->references('id')->on('users')->onDelete('cascade');

            $table->uuid('beneficiaire_id'); // User receiving payment (usually landlord)
            $table->foreign('beneficiaire_id')->references('id')->on('users')->onDelete('cascade');

            // Payment reference (FR-040)
            $table->string('reference_paiement', 100)->unique(); // Format: PAY-2025-XXXXX

            // Amount details (FR-036, FR-044, FR-045)
            $table->decimal('montant_total', 12, 2); // Total amount
            $table->decimal('montant_caution', 12, 2)->nullable(); // Security deposit amount
            $table->decimal('montant_loyer', 12, 2)->nullable(); // Rent amount

            // Commission (FR-045)
            $table->decimal('commission_pourcentage', 5, 2)->default(50.00); // Based on badge: 50%, 40%, 30%
            $table->decimal('commission_montant', 12, 2)->default(0.00);
            $table->date('commission_due_date')->nullable(); // Caution day + 3 months

            // Payment method (FR-039)
            $table->enum('type_paiement', ['ORANGE_MONEY', 'MTN_MOMO', 'VIREMENT', 'ESPECES']);

            // Mobile Money details
            $table->string('mobile_money_reference')->nullable(); // Provider transaction ID
            $table->string('mobile_money_numero')->nullable(); // Phone number used
            $table->json('mobile_money_metadata')->nullable(); // Provider-specific data

            // Payment status (FR-041, FR-042)
            $table->enum('statut', [
                'EN_ATTENTE',      // Waiting for payment
                'ESCROW',          // In escrow (caution held)
                'COMPLETE',        // Payment completed & distributed
                'REMBOURSE',       // Refunded
                'ECHOUE',          // Failed
                'ANNULE'           // Cancelled
            ])->default('EN_ATTENTE');

            // Escrow details (FR-036, FR-037)
            $table->timestamp('escrow_started_at')->nullable();
            $table->timestamp('escrow_released_at')->nullable();
            $table->integer('escrow_duration_days')->nullable(); // Days in escrow
            $table->text('escrow_release_reason')->nullable();

            // Caution day tracking (FR-044)
            $table->date('jour_caution')->nullable(); // The day caution is paid
            $table->timestamp('caution_confirmed_at')->nullable();

            // Distribution (FR-046, FR-047)
            $table->decimal('montant_verse_beneficiaire', 12, 2)->default(0.00);
            $table->timestamp('beneficiaire_payed_at')->nullable();
            $table->string('beneficiaire_receipt_url')->nullable(); // Receipt PDF

            // Platform fees
            $table->decimal('frais_plateforme', 12, 2)->default(0.00);
            $table->timestamp('frais_preleves_at')->nullable();

            // Provider webhook data (FR-043)
            $table->json('webhook_data')->nullable(); // Original webhook payload
            $table->timestamp('webhook_received_at')->nullable();

            // Verification & Security
            $table->string('verification_code', 10)->nullable(); // OTP or verification code
            $table->timestamp('verified_at')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            // Refund details (if applicable)
            $table->decimal('montant_rembourse', 12, 2)->default(0.00);
            $table->timestamp('remboursement_initie_at')->nullable();
            $table->timestamp('remboursement_complete_at')->nullable();
            $table->text('raison_remboursement')->nullable();

            // Error handling
            $table->text('error_message')->nullable();
            $table->integer('retry_count')->default(0);
            $table->timestamp('last_retry_at')->nullable();

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('contract_id');
            $table->index('payeur_id');
            $table->index('beneficiaire_id');
            $table->index('reference_paiement');
            $table->index('statut');
            $table->index('type_paiement');
            $table->index('jour_caution');
            $table->index('commission_due_date');
            $table->index(['escrow_started_at', 'escrow_released_at']);
            $table->index('created_at');
        });

        // Add foreign key constraint for contracts.initial_payment_id now that payments table exists
        Schema::table('contracts', function (Blueprint $table) {
            $table->foreign('initial_payment_id')->references('id')->on('payments')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
