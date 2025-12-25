<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add encryption_key column to messages table for E2E encrypted media.
     * This key is:
     * - Stored when sender sends an E2E message
     * - Returned to recipient via API (so they can decrypt even if they missed WebSocket)
     * - Cleared after recipient downloads the encrypted media
     */
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('encryption_key', 100)->nullable()->after('is_e2e_encrypted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('encryption_key');
        });
    }
};
