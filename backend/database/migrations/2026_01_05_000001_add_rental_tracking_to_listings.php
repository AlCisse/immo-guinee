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
            $table->boolean('rented_via_immoguinee')->nullable()->after('disponible');
            $table->timestamp('rented_at')->nullable()->after('rented_via_immoguinee');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->dropColumn(['rented_via_immoguinee', 'rented_at']);
        });
    }
};
