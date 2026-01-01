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
        Schema::table('visites', function (Blueprint $table) {
            $table->boolean('reminder_24h_sent')->default(false)->after('notification_sent_at');
            $table->boolean('reminder_12h_sent')->default(false)->after('reminder_24h_sent');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('visites', function (Blueprint $table) {
            $table->dropColumn(['reminder_24h_sent', 'reminder_12h_sent']);
        });
    }
};
