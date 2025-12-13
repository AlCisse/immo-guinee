-- ===============================================
-- ImmoGuinée - PostgreSQL Initialization Script
-- Enable PostGIS and other extensions
-- ===============================================

-- Create PostGIS extension for geospatial support (FR-008, FR-020)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create pg_trgm for full-text search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create unaccent for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create btree_gin for compound indexes
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Verify extensions
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('postgis', 'uuid-ossp', 'pg_trgm', 'unaccent', 'btree_gin');

-- Log success
DO $$
BEGIN
    RAISE NOTICE 'ImmoGuinée PostgreSQL extensions initialized successfully!';
    RAISE NOTICE 'PostGIS version: %', postgis_full_version();
END $$;
