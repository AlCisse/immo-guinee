<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds support for short-term rental (location courte durée) with minimum duration in days
     */
    public function up(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            // Duration minimum in days for short-term rentals (1 day minimum)
            $table->unsignedSmallInteger('duree_minimum_jours')->nullable()->after('avance')
                ->comment('Minimum rental duration in days for short-term rentals');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->dropColumn('duree_minimum_jours');
        });
    }
};
