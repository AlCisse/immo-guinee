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
        Schema::create('messages', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign keys
            $table->uuid('conversation_id');
            $table->foreign('conversation_id')->references('id')->on('conversations')->onDelete('cascade');

            $table->uuid('sender_id');
            $table->foreign('sender_id')->references('id')->on('users')->onDelete('cascade');

            // Message content (FR-059)
            $table->enum('type_message', ['TEXT', 'VOCAL', 'PHOTO', 'SYSTEM'])->default('TEXT');
            $table->text('contenu')->nullable(); // Text content
            $table->string('media_url')->nullable(); // Photo or voice message URL
            $table->string('media_mime_type', 100)->nullable();
            $table->integer('media_size')->nullable(); // File size in bytes

            // Voice message duration
            $table->integer('vocal_duration_seconds')->nullable();

            // Read status (FR-063)
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();

            // Delivery status (for push notifications)
            $table->boolean('is_delivered')->default(false);
            $table->timestamp('delivered_at')->nullable();

            // Moderation (FR-064)
            $table->boolean('is_reported')->default(false);
            $table->timestamp('reported_at')->nullable();
            $table->uuid('reported_by')->nullable();
            $table->foreign('reported_by')->references('id')->on('users')->onDelete('set null');
            $table->text('report_reason')->nullable();

            $table->boolean('is_flagged')->default(false); // Flagged by AI/admin
            $table->text('flag_reason')->nullable();

            // Fraud detection (FR-065)
            $table->json('fraud_score_data')->nullable(); // AI fraud detection results
            $table->boolean('is_blocked')->default(false);

            // Reply reference (threading) - foreign key added after table creation
            $table->uuid('reply_to_message_id')->nullable();

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('conversation_id');
            $table->index('sender_id');
            $table->index('type_message');
            $table->index('is_read');
            $table->index('is_reported');
            $table->index('created_at');
        });

        // Add self-referencing foreign key after table creation
        Schema::table('messages', function (Blueprint $table) {
            $table->foreign('reply_to_message_id')->references('id')->on('messages')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
