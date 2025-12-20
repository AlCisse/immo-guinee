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
        Schema::table('listings', function (Blueprint $table) {
            // Type de locataire préféré
            $table->string('type_locataire_prefere')->nullable()->after('meuble');

            // Commission en mois de loyer (pour le propriétaire/agent)
            $table->unsignedTinyInteger('commission_mois')->nullable()->default(1)->after('avance');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->dropColumn(['type_locataire_prefere', 'commission_mois']);
        });
    }
};
