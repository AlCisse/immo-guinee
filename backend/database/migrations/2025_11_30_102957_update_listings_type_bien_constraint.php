<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Supprimer la contrainte CHECK existante
        DB::statement('ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_type_bien_check');

        // Ajouter une nouvelle contrainte avec les valeurs autorisées
        DB::statement("ALTER TABLE listings ADD CONSTRAINT listings_type_bien_check CHECK (type_bien IN ('APPARTEMENT', 'MAISON', 'VILLA', 'STUDIO', 'TERRAIN', 'COMMERCIAL', 'BUREAU', 'ENTREPOT', 'USINE', 'FERME', 'AUTRE'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_type_bien_check');

        // Restaurer l'ancienne contrainte si nécessaire
        DB::statement("ALTER TABLE listings ADD CONSTRAINT listings_type_bien_check CHECK (type_bien IN ('APPARTEMENT', 'MAISON', 'VILLA', 'STUDIO', 'TERRAIN', 'COMMERCIAL'))");
    }
};
