-- ===============================================
-- ImmoGuinée - PostgreSQL Custom Functions
-- Utility functions for the application
-- ===============================================

-- Function to calculate distance between two points (FR-020 rayon search)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN ST_Distance(
        ST_MakePoint(lon1, lat1)::geography,
        ST_MakePoint(lon2, lat2)::geography
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_distance IS 'Calculate distance in meters between two GPS coordinates';

-- Function to find listings within radius (FR-020)
CREATE OR REPLACE FUNCTION find_listings_in_radius(
    center_lat DOUBLE PRECISION,
    center_lon DOUBLE PRECISION,
    radius_meters INTEGER
) RETURNS TABLE (
    listing_id UUID,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        id::UUID,
        ST_Distance(
            ST_MakePoint(center_lon, center_lat)::geography,
            geolocalisation::geography
        ) AS distance_meters
    FROM listings
    WHERE ST_DWithin(
        ST_MakePoint(center_lon, center_lat)::geography,
        geolocalisation::geography,
        radius_meters
    )
    AND statut = 'publie'
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_listings_in_radius IS 'Find all published listings within a given radius (meters) from a GPS point';

-- Function to clean expired listings (FR-014)
CREATE OR REPLACE FUNCTION clean_expired_listings()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE listings
    SET statut = 'expire'
    WHERE statut = 'publie'
    AND created_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS expired_count = ROW_COUNT;

    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_expired_listings IS 'Mark listings as expired after 90 days (FR-014)';

-- Function to update listing view counter atomically
CREATE OR REPLACE FUNCTION increment_listing_views(listing_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE listings
    SET vues_total = vues_total + 1
    WHERE id = listing_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_listing_views IS 'Atomically increment listing view counter';

-- Function to update listing contact counter atomically
CREATE OR REPLACE FUNCTION increment_listing_contacts(listing_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE listings
    SET contacts_total = contacts_total + 1
    WHERE id = listing_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_listing_contacts IS 'Atomically increment listing contact counter';

-- Function to calculate user rating average
CREATE OR REPLACE FUNCTION calculate_user_rating(user_uuid UUID)
RETURNS NUMERIC(3, 2) AS $$
DECLARE
    avg_rating NUMERIC(3, 2);
BEGIN
    SELECT COALESCE(AVG(note), 0.0)
    INTO avg_rating
    FROM ratings
    WHERE user_evalue_id = user_uuid
    AND statut = 'valide';

    RETURN avg_rating;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_user_rating IS 'Calculate average rating for a user (validated ratings only)';

-- Function to get quartier from coordinates (reverse geocoding)
CREATE OR REPLACE FUNCTION get_quartier_from_coords(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
) RETURNS VARCHAR(100) AS $$
DECLARE
    quartier_name VARCHAR(100);
BEGIN
    -- This is a placeholder - actual implementation would use PostGIS
    -- to find the closest quartier polygon
    SELECT nom
    INTO quartier_name
    FROM quartiers
    ORDER BY ST_Distance(
        geom,
        ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    )
    LIMIT 1;

    RETURN COALESCE(quartier_name, 'Unknown');
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_quartier_from_coords IS 'Get quartier name from GPS coordinates (reverse geocoding)';

-- Log
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL custom functions created successfully!';
    RAISE NOTICE 'Functions: calculate_distance, find_listings_in_radius, clean_expired_listings, etc.';
END $$;
