<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Facebook Page Connections Table
     *
     * Stores encrypted Facebook Page access tokens for auto-publication.
     *
     * Security:
     * - page_access_token is encrypted with AES-256-GCM (Laravel Crypt)
     * - One page per user (unique constraint)
     * - Tokens NEVER logged or exposed in API responses
     *
     * @see specs/001-immog-platform/contracts/facebook.md
     */
    public function up(): void
    {
        Schema::create('facebook_page_connections', function (Blueprint $table) {
            // Primary key
            $table->uuid('id')->primary();

            // Foreign key to users table
            $table->uuid('user_id');
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            // Facebook Page information
            $table->string('page_id', 255)->comment('Facebook Page ID');
            $table->string('page_name', 255)->comment('Facebook Page display name');

            // Encrypted access token (AES-256-GCM via Laravel Crypt)
            // NEVER log or expose this field
            $table->text('page_access_token')->comment('Encrypted with AES-256-GCM');

            // Token expiration tracking for auto-refresh
            $table->timestamp('token_expires_at')->nullable()->comment('Token expiration for refresh scheduling');

            // User consent for auto-publication (opt-in required)
            $table->boolean('auto_publish_enabled')->default(false)->comment('User opt-in for automatic publication');

            // Connection timestamp (for audit)
            $table->timestamp('connected_at')->useCurrent()->comment('When the page was connected');

            // Standard timestamps
            $table->timestamps();

            // Constraints
            // One page per user (users can only connect one Facebook Page)
            $table->unique('user_id', 'facebook_page_connections_user_unique');

            // Index for token refresh job (find expiring tokens)
            $table->index('token_expires_at', 'idx_fb_connections_token_expires');

            // Index for auto-publish queries
            $table->index('auto_publish_enabled', 'idx_fb_connections_auto_publish');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facebook_page_connections');
    }
};
