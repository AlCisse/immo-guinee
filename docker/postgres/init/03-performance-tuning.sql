-- ===============================================
-- ImmoGuinée - PostgreSQL Performance Tuning
-- Optimize database for production workload
-- ===============================================

-- Increase statistics target for better query planning
ALTER DATABASE immog_db SET default_statistics_target = 100;

-- Set work_mem for complex queries (per connection)
ALTER DATABASE immog_db SET work_mem = '16MB';

-- Set maintenance_work_mem for VACUUM, CREATE INDEX
ALTER DATABASE immog_db SET maintenance_work_mem = '256MB';

-- Enable auto-explain for slow queries (log queries > 2s)
ALTER DATABASE immog_db SET auto_explain.log_min_duration = '2000ms';
ALTER DATABASE immog_db SET auto_explain.log_analyze = true;

-- Set random page cost for SSD storage
ALTER DATABASE immog_db SET random_page_cost = 1.1;

-- Enable parallel query execution
ALTER DATABASE immog_db SET max_parallel_workers_per_gather = 4;

-- Set effective_cache_size (50% of available RAM, adjust in production)
ALTER DATABASE immog_db SET effective_cache_size = '2GB';

-- Optimize for read-heavy workload
ALTER DATABASE immog_db SET effective_io_concurrency = 200;

-- Set timezone to Africa/Conakry (GMT)
ALTER DATABASE immog_db SET timezone = 'Africa/Conakry';

-- Set locale for case-insensitive sorting
ALTER DATABASE immog_db SET lc_collate = 'fr_GN.UTF-8';
ALTER DATABASE immog_db SET lc_ctype = 'fr_GN.UTF-8';

-- Log
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL performance tuning applied successfully!';
    RAISE NOTICE 'Database: immog_db';
    RAISE NOTICE 'Timezone: Africa/Conakry';
END $$;
