<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visites', function (Blueprint $table) {
            // Client response fields
            $table->string('client_response')->nullable()->after('notes_proprietaire'); // CONFIRMED, UNAVAILABLE, RESCHEDULE
            $table->date('proposed_date')->nullable()->after('client_response'); // Alternative date proposed by client
            $table->string('proposed_time')->nullable()->after('proposed_date'); // Alternative time
            $table->text('client_message')->nullable()->after('proposed_time'); // Client's message/reason
            $table->timestamp('client_responded_at')->nullable()->after('client_message');
            $table->string('response_token', 64)->nullable()->unique()->after('client_responded_at'); // For public response link
            $table->boolean('notification_sent')->default(false)->after('response_token');
            $table->timestamp('notification_sent_at')->nullable()->after('notification_sent');
        });
    }

    public function down(): void
    {
        Schema::table('visites', function (Blueprint $table) {
            $table->dropColumn([
                'client_response',
                'proposed_date',
                'proposed_time',
                'client_message',
                'client_responded_at',
                'response_token',
                'notification_sent',
                'notification_sent_at',
            ]);
        });
    }
};
