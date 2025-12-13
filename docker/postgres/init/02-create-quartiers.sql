-- ===============================================
-- ImmoGuinée - Quartiers de Conakry
-- Create quartiers data for geolocation (FR-008)
-- ===============================================

-- This script will create the quartiers table and populate it
-- It will be executed by Laravel migrations, but we keep it here
-- as reference for manual initialization if needed.

-- Note: The actual table creation is done by Laravel migrations
-- This is just a reference script for the quartiers data

-- Example quartiers data (will be seeded by Laravel DatabaseSeeder):
--
-- KALOUM (Centre-ville):
-- - Almamya, Boulbinet, Coronthie, Manquepas, Sandervalia, Tombo, etc.
--
-- DIXINN:
-- - Hamdallaye, Cameroun, Kipé, Lambandji, Ratoma Centre, etc.
--
-- MATAM:
-- - Matam Centre, Donka, Manquepas, Taouyah, Tombo, etc.
--
-- MATOTO:
-- - Cosa, Koloma, Matoto Centre, Yimbaya, Kagbélen, Sonfonia, etc.
--
-- RATOMA:
-- - Ratoma Centre, Kaporo Rails, Dar Es Salam, Wanindara, etc.

-- Spatial indexes will be created by Laravel migrations
-- Example:
-- CREATE INDEX listings_geolocalisation_idx ON listings USING GIST (geolocalisation);

-- Log
DO $$
BEGIN
    RAISE NOTICE 'Quartiers reference data documented. Will be seeded by Laravel.';
END $$;
