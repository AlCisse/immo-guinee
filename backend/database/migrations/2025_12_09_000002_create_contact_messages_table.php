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
        Schema::create('contact_messages', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));

            // Utilisateur (optionnel si non connecté)
            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');

            // Informations du contact
            $table->string('nom');
            $table->string('email');
            $table->string('telephone')->nullable();
            $table->string('sujet');
            $table->text('message');

            // Statut
            $table->enum('statut', ['EN_ATTENTE', 'EN_COURS', 'TRAITE', 'ARCHIVE'])->default('EN_ATTENTE');

            // Réponse admin
            $table->text('reponse')->nullable();
            $table->uuid('repondu_par')->nullable();
            $table->foreign('repondu_par')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('repondu_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('statut');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contact_messages');
    }
};
