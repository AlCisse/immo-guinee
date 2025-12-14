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
        Schema::create('conversations', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign keys
            $table->uuid('listing_id')->nullable(); // Conversation about a specific listing
            $table->foreign('listing_id')->references('id')->on('listings')->onDelete('set null');

            $table->uuid('initiator_id'); // User who started conversation
            $table->foreign('initiator_id')->references('id')->on('users')->onDelete('cascade');

            $table->uuid('participant_id'); // Other user in conversation
            $table->foreign('participant_id')->references('id')->on('users')->onDelete('cascade');

            // Conversation metadata
            $table->string('subject', 255)->nullable(); // Conversation subject
            $table->timestamp('last_message_at')->nullable();

            // Status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_archived_by_initiator')->default(false);
            $table->boolean('is_archived_by_participant')->default(false);

            // Phone masking (FR-060)
            $table->string('masked_phone_initiator', 20)->nullable(); // Virtual phone number
            $table->string('masked_phone_participant', 20)->nullable();

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('listing_id');
            $table->index('initiator_id');
            $table->index('participant_id');
            $table->index(['initiator_id', 'participant_id']); // Compound index
            $table->index('last_message_at');
            $table->index('created_at');

            // Unique constraint: one conversation per listing per user pair
            $table->unique(['listing_id', 'initiator_id', 'participant_id'], 'unique_conversation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
