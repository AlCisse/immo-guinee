<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Facebook Posts Table
     *
     * Tracks published Facebook posts linked to listings for auto-deletion
     * when listings are marked as rented or sold.
     *
     * @see specs/001-immog-platform/contracts/facebook.md
     */
    public function up(): void
    {
        Schema::create('facebook_posts', function (Blueprint $table) {
            // Primary key
            $table->uuid('id')->primary();

            // Foreign key to listings table
            $table->uuid('listing_id');
            $table->foreign('listing_id')
                ->references('id')
                ->on('listings')
                ->onDelete('cascade');

            // Foreign key to facebook_page_connections table
            $table->uuid('facebook_page_connection_id');
            $table->foreign('facebook_page_connection_id')
                ->references('id')
                ->on('facebook_page_connections')
                ->onDelete('cascade');

            // Facebook Post ID (for deletion via Graph API)
            $table->string('facebook_post_id', 255)->comment('Facebook Post ID for Graph API operations');

            // Post status tracking
            $table->enum('status', ['published', 'deleted', 'failed'])
                ->default('published')
                ->comment('Current status of the Facebook post');

            // Timestamps for publication and deletion
            $table->timestamp('published_at')->nullable()->comment('When the post was published to Facebook');
            $table->timestamp('deleted_at')->nullable()->comment('When the post was deleted from Facebook');

            // Error tracking (i18n key, no sensitive data)
            $table->text('error_message')->nullable()->comment('i18n error key if publication/deletion failed');

            // Standard timestamps
            $table->timestamps();

            // Indexes for efficient queries
            // Index for finding posts by listing (auto-delete workflow)
            $table->index('listing_id', 'idx_facebook_posts_listing');

            // Index for filtering by status (monitoring, cleanup)
            $table->index('status', 'idx_facebook_posts_status');

            // Composite index for published posts by connection (dashboard stats)
            $table->index(['facebook_page_connection_id', 'status'], 'idx_facebook_posts_connection_status');

            // Index for finding posts by facebook_post_id (deletion verification)
            $table->index('facebook_post_id', 'idx_facebook_posts_fb_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facebook_posts');
    }
};
