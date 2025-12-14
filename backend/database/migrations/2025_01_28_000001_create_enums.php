<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Badge enum (FR-053)
        DB::statement("DROP TYPE IF EXISTS badge CASCADE");
        DB::statement("CREATE TYPE badge AS ENUM ('BRONZE', 'ARGENT', 'OR', 'DIAMANT')");

        // Type compte enum (FR-002)
        DB::statement("DROP TYPE IF EXISTS type_compte CASCADE");
        DB::statement("CREATE TYPE type_compte AS ENUM ('PARTICULIER', 'AGENCE', 'PROMOTEUR')");

        // Statut verification enum
        DB::statement("DROP TYPE IF EXISTS statut_verification CASCADE");
        DB::statement("CREATE TYPE statut_verification AS ENUM ('EN_ATTENTE', 'VERIFIE', 'REJETE')");

        // Type bien enum (FR-007)
        DB::statement("DROP TYPE IF EXISTS type_bien CASCADE");
        DB::statement("CREATE TYPE type_bien AS ENUM ('STUDIO', 'CHAMBRE_SALON', 'APPARTEMENT_2CH', 'APPARTEMENT_3CH', 'VILLA', 'DUPLEX', 'BUREAU')");

        // Statut annonce enum (FR-012, FR-015)
        DB::statement("DROP TYPE IF EXISTS statut_annonce CASCADE");
        DB::statement("CREATE TYPE statut_annonce AS ENUM ('BROUILLON', 'EN_ATTENTE', 'ACTIVE', 'SUSPENDUE', 'EXPIREE', 'ARCHIVEE')");

        // Statut contrat enum (FR-026)
        DB::statement("DROP TYPE IF EXISTS statut_contrat CASCADE");
        DB::statement("CREATE TYPE statut_contrat AS ENUM ('BROUILLON', 'EN_ATTENTE_SIGNATURE_LOCATAIRE', 'EN_ATTENTE_SIGNATURE_BAILLEUR', 'SIGNE', 'ACTIF', 'TERMINE', 'ANNULE')");

        // Type paiement enum (FR-039)
        DB::statement("DROP TYPE IF EXISTS type_paiement CASCADE");
        DB::statement("CREATE TYPE type_paiement AS ENUM ('ORANGE_MONEY', 'MTN_MOMO', 'VIREMENT', 'ESPECES')");

        // Statut paiement enum (FR-041)
        DB::statement("DROP TYPE IF EXISTS statut_paiement CASCADE");
        DB::statement("CREATE TYPE statut_paiement AS ENUM ('EN_ATTENTE', 'ESCROW', 'COMPLETE', 'REMBOURSE', 'ECHOUE', 'ANNULE')");

        // Statut transaction enum
        DB::statement("DROP TYPE IF EXISTS statut_transaction CASCADE");
        DB::statement("CREATE TYPE statut_transaction AS ENUM ('EN_ATTENTE', 'VALIDE', 'ANNULE')");

        // Type certification enum (FR-054)
        DB::statement("DROP TYPE IF EXISTS type_certification CASCADE");
        DB::statement("CREATE TYPE type_certification AS ENUM ('CNI', 'TITRE_FONCIER', 'AUTRES')");

        // Statut litige enum (FR-069)
        DB::statement("DROP TYPE IF EXISTS statut_litige CASCADE");
        DB::statement("CREATE TYPE statut_litige AS ENUM ('OUVERT', 'EN_MEDIATION', 'RESOLU_AMIABLE', 'RESOLU_JUDICIAIRE', 'FERME')");

        // Canal notification enum (FR-061)
        DB::statement("DROP TYPE IF EXISTS canal_notification CASCADE");
        DB::statement("CREATE TYPE canal_notification AS ENUM ('EMAIL', 'WHATSAPP', 'SMS', 'TELEGRAM', 'IN_APP')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TYPE IF EXISTS canal_notification');
        DB::statement('DROP TYPE IF EXISTS statut_litige');
        DB::statement('DROP TYPE IF EXISTS type_certification');
        DB::statement('DROP TYPE IF EXISTS statut_transaction');
        DB::statement('DROP TYPE IF EXISTS statut_paiement');
        DB::statement('DROP TYPE IF EXISTS type_paiement');
        DB::statement('DROP TYPE IF EXISTS statut_contrat');
        DB::statement('DROP TYPE IF EXISTS statut_annonce');
        DB::statement('DROP TYPE IF EXISTS type_bien');
        DB::statement('DROP TYPE IF EXISTS statut_verification');
        DB::statement('DROP TYPE IF EXISTS type_compte');
        DB::statement('DROP TYPE IF EXISTS badge');
    }
};
