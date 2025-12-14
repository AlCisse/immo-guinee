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
        // Create visite_statut enum
        DB::statement("DO $$ BEGIN
            CREATE TYPE visite_statut AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;");

        Schema::create('visites', function (Blueprint $table) {
            // Primary key (UUID)
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Foreign keys
            $table->uuid('listing_id');
            $table->foreign('listing_id')->references('id')->on('listings')->onDelete('cascade');

            // User who owns the listing (property owner/landlord)
            $table->uuid('proprietaire_id');
            $table->foreign('proprietaire_id')->references('id')->on('users')->onDelete('cascade');

            // Optional: logged in user who requested the visit
            $table->uuid('visiteur_id')->nullable();
            $table->foreign('visiteur_id')->references('id')->on('users')->onDelete('set null');

            // Client info (for non-logged in visitors or different contact)
            $table->string('client_nom', 255);
            $table->string('client_telephone', 20);
            $table->string('client_email', 255)->nullable();

            // Visit scheduling
            $table->date('date_visite');
            $table->time('heure_visite');
            $table->integer('duree_minutes')->default(30); // Duration in minutes

            // Status using enum
            $table->string('statut', 20)->default('PENDING');

            // Notes
            $table->text('notes')->nullable();
            $table->text('notes_proprietaire')->nullable(); // Notes from property owner
            $table->text('motif_annulation')->nullable(); // Cancellation reason

            // Confirmation tracking
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->uuid('cancelled_by')->nullable();
            $table->foreign('cancelled_by')->references('id')->on('users')->onDelete('set null');

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('listing_id');
            $table->index('proprietaire_id');
            $table->index('visiteur_id');
            $table->index('date_visite');
            $table->index('statut');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visites');
        DB::statement("DROP TYPE IF EXISTS visite_statut;");
    }
};
