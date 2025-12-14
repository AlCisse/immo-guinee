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
        Schema::create('reports', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Reporter (who made the report)
            $table->uuid('reporter_id');
            $table->foreign('reporter_id')->references('id')->on('users')->onDelete('cascade');

            // Type of report
            $table->string('type', 50); // LISTING, USER, MESSAGE

            // What is being reported (polymorphic)
            $table->uuid('listing_id')->nullable();
            $table->foreign('listing_id')->references('id')->on('listings')->onDelete('cascade');

            $table->uuid('reported_user_id')->nullable();
            $table->foreign('reported_user_id')->references('id')->on('users')->onDelete('cascade');

            $table->uuid('message_id')->nullable();
            $table->foreign('message_id')->references('id')->on('messages')->onDelete('cascade');

            // Report details
            $table->string('reason', 100); // SPAM, FRAUD, INAPPROPRIATE, FAKE, OTHER
            $table->text('description')->nullable();
            $table->string('severity', 20)->default('MEDIUM'); // CRITICAL, HIGH, MEDIUM, LOW

            // Status and processing
            $table->string('status', 20)->default('PENDING'); // PENDING, PROCESSED, ESCALATED, DISMISSED
            $table->string('action_taken', 50)->nullable(); // dismiss, warn, suspend_listing, suspend_user, escalate
            $table->text('moderator_note')->nullable();

            // Who processed it
            $table->uuid('processed_by')->nullable();
            $table->foreign('processed_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('processed_at')->nullable();

            $table->timestamps();

            // Indexes
            $table->index('type');
            $table->index('status');
            $table->index('severity');
            $table->index('created_at');
            $table->index(['status', 'severity']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
