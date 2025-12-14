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
        Schema::table('listings', function (Blueprint $table) {
            $table->string('type_transaction', 20)->default('LOCATION')->after('type_bien');
        });

        // Update existing listings - all current listings are rentals (LOCATION)
        DB::table('listings')->update(['type_transaction' => 'LOCATION']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->dropColumn('type_transaction');
        });
    }
};
