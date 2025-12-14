<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Authentication (FR-001, FR-003)
            $table->string('telephone', 20)->unique(); // Format: +224622123456
            $table->string('mot_de_passe'); // bcrypt hash
            $table->timestamp('telephone_verified_at')->nullable();

            // Profile information (FR-002)
            $table->string('nom_complet', 255);
            $table->string('email', 255)->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->enum('type_compte', ['PARTICULIER', 'AGENCE', 'PROMOTEUR']);

            // For agencies/promoters
            $table->string('nom_entreprise', 255)->nullable();
            $table->string('numero_registre_commerce', 50)->nullable();
            $table->text('adresse')->nullable();

            // Badge system (FR-053)
            $table->enum('badge', ['BRONZE', 'ARGENT', 'OR', 'DIAMANT'])->default('BRONZE');
            $table->timestamp('badge_updated_at')->nullable();

            // Statistics for badge calculation
            $table->integer('total_transactions')->default(0);
            $table->decimal('avg_rating', 3, 2)->default(0.00); // 0.00 to 5.00
            $table->integer('total_disputes')->default(0);
            $table->integer('disputes_resolved')->default(0);

            // Verification status
            $table->enum('statut_verification', ['EN_ATTENTE', 'VERIFIE', 'REJETE'])->default('EN_ATTENTE');
            $table->timestamp('verified_at')->nullable();

            // Two-factor authentication (FR-005)
            $table->string('two_factor_secret')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();
            $table->timestamp('two_factor_confirmed_at')->nullable();

            // Account status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_suspended')->default(false);
            $table->timestamp('suspended_at')->nullable();
            $table->text('suspension_reason')->nullable();

            // Preferences (FR-061)
            $table->json('notification_preferences')->nullable(); // {email: true, whatsapp: true, sms: false, telegram: false}
            $table->string('preferred_language', 5)->default('fr'); // fr, en

            // OAuth tokens (Laravel Passport)
            $table->rememberToken();

            // Timestamps
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('telephone');
            $table->index('email');
            $table->index('badge');
            $table->index('type_compte');
            $table->index('statut_verification');
            $table->index('is_active');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
