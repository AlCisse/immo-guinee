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
        // In local environment, skip PostGIS if not available
        if (app()->environment('local')) {
            // Enable UUID extension for primary keys
            DB::statement('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

            // Enable pg_trgm for full-text search optimization
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

            logger()->info('PostGIS extension skipped in local environment.');
            return;
        }

        // Enable PostGIS extension for geospatial support (FR-008, FR-017)
        DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');

        // Enable UUID extension for primary keys
        DB::statement('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        // Enable pg_trgm for full-text search optimization
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP EXTENSION IF EXISTS pg_trgm');
        DB::statement('DROP EXTENSION IF EXISTS "uuid-ossp"');
        DB::statement('DROP EXTENSION IF EXISTS postgis');
    }
};
