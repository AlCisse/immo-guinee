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
        Schema::table('encrypted_media', function (Blueprint $table) {
            // Track reminder notification
            $table->boolean('reminder_sent')->default(false)->after('downloaded_at');
            $table->timestamp('reminder_sent_at')->nullable()->after('reminder_sent');

            // Track deletion reason (deleted_at already exists in create migration)
            $table->string('deletion_reason')->nullable()->after('is_deleted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('encrypted_media', function (Blueprint $table) {
            $table->dropColumn([
                'reminder_sent',
                'reminder_sent_at',
                'deletion_reason',
            ]);
        });
    }
};
