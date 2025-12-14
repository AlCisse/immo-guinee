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
        Schema::create('moderation_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Who performed the action
            $table->uuid('moderator_id');
            $table->foreign('moderator_id')->references('id')->on('users')->onDelete('cascade');

            // Action performed
            $table->string('action', 50); // approve, reject, suspend, unsuspend, warn, flag, handle_report, contact_owner, request_changes

            // Entity affected (polymorphic)
            $table->string('entity_type', 50); // listing, user, report, message
            $table->uuid('entity_id');

            // Additional details
            $table->text('note')->nullable();

            // Security/audit info
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamps();

            // Indexes for querying
            $table->index('moderator_id');
            $table->index('action');
            $table->index('entity_type');
            $table->index(['entity_type', 'entity_id']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('moderation_logs');
    }
};
