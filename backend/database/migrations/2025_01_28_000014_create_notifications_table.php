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
        Schema::create('notifications', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign key
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            // Notification type and content
            $table->string('type', 100); // e.g., "NEW_MESSAGE", "CONTRACT_SIGNED", "PAYMENT_RECEIVED"
            $table->string('titre', 255);
            $table->text('message');

            // Notification data (FR-061)
            $table->json('data')->nullable(); // Related IDs, URLs, etc.
            $table->string('action_url')->nullable(); // Deep link to relevant page

            // Multi-channel delivery (FR-061)
            $table->json('canaux')->nullable(); // ['EMAIL', 'WHATSAPP', 'SMS', 'TELEGRAM', 'IN_APP']
            $table->timestamp('email_sent_at')->nullable();
            $table->timestamp('whatsapp_sent_at')->nullable();
            $table->timestamp('sms_sent_at')->nullable();
            $table->timestamp('telegram_sent_at')->nullable();

            // Read status
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();

            // Priority
            $table->enum('priority', ['LOW', 'NORMAL', 'HIGH', 'URGENT'])->default('NORMAL');

            // Timestamps
            $table->timestamps();

            // Indexes
            $table->index('user_id');
            $table->index('type');
            $table->index('is_read');
            $table->index('priority');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
