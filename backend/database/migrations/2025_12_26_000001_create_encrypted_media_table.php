<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates the encrypted_media table for E2E encrypted media storage.
     * The server stores only encrypted blobs - decryption keys are NEVER stored.
     */
    public function up(): void
    {
        Schema::create('encrypted_media', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Reference to message (linked after message creation)
            $table->uuid('message_id')->nullable();
            $table->foreign('message_id')
                  ->references('id')
                  ->on('messages')
                  ->onDelete('cascade');

            // Uploader reference
            $table->uuid('uploader_id');
            $table->foreign('uploader_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');

            // Conversation for access control
            $table->uuid('conversation_id');
            $table->foreign('conversation_id')
                  ->references('id')
                  ->on('conversations')
                  ->onDelete('cascade');

            // Media type
            $table->enum('media_type', ['VOCAL', 'PHOTO', 'VIDEO']);

            // Storage info (encrypted blob)
            $table->string('storage_path');
            $table->string('storage_disk', 50)->default('encrypted-temp');
            $table->bigInteger('encrypted_size'); // Size of encrypted blob
            $table->bigInteger('original_size')->nullable(); // Original size for UI

            // Encryption metadata (IV and auth tag are safe to store, key is NOT)
            $table->string('iv', 24); // Base64 encoded 12-byte IV
            $table->string('auth_tag', 32)->nullable(); // Base64 encoded 16-byte auth tag

            // Original file metadata
            $table->string('mime_type', 100)->nullable();
            $table->integer('duration_seconds')->nullable(); // For audio/video

            // TTL and download tracking
            $table->timestamp('expires_at');
            $table->boolean('is_downloaded_by_recipient')->default(false);
            $table->timestamp('downloaded_at')->nullable();
            $table->uuid('downloaded_by')->nullable();
            $table->foreign('downloaded_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');

            // Cleanup status (soft delete for audit)
            $table->boolean('is_deleted')->default(false);
            $table->timestamp('deleted_at')->nullable();

            $table->timestamps();

            // Indexes for efficient queries
            $table->index('uploader_id');
            $table->index('conversation_id');
            $table->index('expires_at');
            $table->index(['is_deleted', 'expires_at']); // For cleanup job
            $table->index(['is_downloaded_by_recipient', 'is_deleted']); // For cleanup
        });

        // Add E2E encrypted media support to messages table
        Schema::table('messages', function (Blueprint $table) {
            $table->uuid('encrypted_media_id')->nullable()->after('media_size');
            $table->foreign('encrypted_media_id')
                  ->references('id')
                  ->on('encrypted_media')
                  ->onDelete('set null');
            $table->boolean('is_e2e_encrypted')->default(false)->after('encrypted_media_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['encrypted_media_id']);
            $table->dropColumn(['encrypted_media_id', 'is_e2e_encrypted']);
        });

        Schema::dropIfExists('encrypted_media');
    }
};
