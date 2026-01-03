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
        // Ajouter type_contrat à contracts
        if (!Schema::hasColumn('contracts', 'type_contrat')) {
            Schema::table('contracts', function (Blueprint $table) {
                $table->string('type_contrat')->default('location')->after('statut');
            });
        }

        // Ajouter colonnes manquantes à payments
        if (!Schema::hasColumn('payments', 'date_confirmation')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->timestamp('date_confirmation')->nullable()->after('verified_at');
            });
        }

        if (!Schema::hasColumn('payments', 'prix_gnf')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->decimal('prix_gnf', 15, 2)->nullable()->after('montant_total');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn('type_contrat');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['date_confirmation', 'prix_gnf']);
        });
    }
};
