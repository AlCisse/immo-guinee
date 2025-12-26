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
        Schema::table('users', function (Blueprint $table) {
            // CGU acceptance tracking
            $table->timestamp('cgu_accepted_at')->nullable()->after('email_verified_at');
            $table->string('cgu_version', 20)->nullable()->after('cgu_accepted_at');
            $table->string('cgu_accepted_ip', 45)->nullable()->after('cgu_version');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['cgu_accepted_at', 'cgu_version', 'cgu_accepted_ip']);
        });
    }
};
