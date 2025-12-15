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
        Schema::create('whatsapp_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Recipient info
            $table->string('phone_number', 20);
            $table->uuid('user_id')->nullable();

            // Message content
            $table->text('message');
            $table->string('type', 50)->default('general'); // otp, account_verification, new_message, contract, payment, listing_reminder, visit_confirmation, etc.

            // Status tracking
            $table->string('status', 20)->default('pending'); // pending, sent, delivered, read, failed
            $table->string('waha_message_id')->nullable()->index();

            // Timing
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();

            // Error handling
            $table->text('error_message')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->unsignedTinyInteger('max_attempts')->default(3);

            // Additional data
            $table->json('metadata')->nullable();
            $table->json('response_data')->nullable();

            $table->timestamps();

            // Indexes for common queries
            $table->index(['phone_number', 'created_at']);
            $table->index(['status', 'created_at']);
            $table->index(['type', 'created_at']);
            $table->index(['user_id']);

            // Foreign key
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_messages');
    }
};
