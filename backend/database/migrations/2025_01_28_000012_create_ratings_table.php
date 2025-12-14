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
        Schema::create('ratings', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign keys
            $table->uuid('contract_id');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('cascade');

            $table->uuid('evaluateur_id'); // User giving the rating
            $table->foreign('evaluateur_id')->references('id')->on('users')->onDelete('cascade');

            $table->uuid('evalue_id'); // User being rated
            $table->foreign('evalue_id')->references('id')->on('users')->onDelete('cascade');

            // Rating details (FR-058)
            $table->integer('note')->unsigned(); // 1 to 5 stars
            $table->text('commentaire')->nullable();

            // Rating categories (optional - for more detailed feedback)
            $table->integer('note_communication')->unsigned()->nullable(); // 1-5
            $table->integer('note_ponctualite')->unsigned()->nullable(); // 1-5
            $table->integer('note_proprete')->unsigned()->nullable(); // 1-5 (for property condition)
            $table->integer('note_respect_contrat')->unsigned()->nullable(); // 1-5

            // Moderation
            $table->boolean('is_published')->default(true);
            $table->boolean('is_flagged')->default(false);
            $table->text('flag_reason')->nullable();

            // Response from rated user
            $table->text('reponse')->nullable();
            $table->timestamp('reponse_at')->nullable();

            // Helpful votes (like Airbnb)
            $table->integer('helpful_count')->default(0);

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('contract_id');
            $table->index('evaluateur_id');
            $table->index('evalue_id');
            $table->index('note');
            $table->index('is_published');
            $table->index('created_at');

            // Constraint: one rating per user per contract
            $table->unique(['contract_id', 'evaluateur_id'], 'unique_rating_per_contract');
        });

        // Add check constraints for rating values (1-5)
        DB::statement('ALTER TABLE ratings ADD CONSTRAINT ratings_note_check CHECK (note >= 1 AND note <= 5)');
        DB::statement('ALTER TABLE ratings ADD CONSTRAINT ratings_note_communication_check CHECK (note_communication IS NULL OR (note_communication >= 1 AND note_communication <= 5))');
        DB::statement('ALTER TABLE ratings ADD CONSTRAINT ratings_note_ponctualite_check CHECK (note_ponctualite IS NULL OR (note_ponctualite >= 1 AND note_ponctualite <= 5))');
        DB::statement('ALTER TABLE ratings ADD CONSTRAINT ratings_note_proprete_check CHECK (note_proprete IS NULL OR (note_proprete >= 1 AND note_proprete <= 5))');
        DB::statement('ALTER TABLE ratings ADD CONSTRAINT ratings_note_respect_contrat_check CHECK (note_respect_contrat IS NULL OR (note_respect_contrat >= 1 AND note_respect_contrat <= 5))');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ratings');
    }
};
