-- ============================================
-- PostgreSQL Role Separation for ImmoGuinée
-- ============================================
-- This script creates three separate database roles:
-- 1. immog_user (migration_user) - Full DDL privileges for migrations
-- 2. immog_app - Limited DML privileges for application runtime
-- 3. immog_backup - Read-only access for backups and monitoring
-- ============================================

-- Create roles if they don't exist
DO $$
BEGIN
    -- App role (SELECT, INSERT, UPDATE, DELETE - no DDL)
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'immog_app') THEN
        CREATE ROLE immog_app WITH LOGIN;
        RAISE NOTICE 'Created role: immog_app';
    END IF;

    -- Backup role (SELECT only - read-only)
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'immog_backup') THEN
        CREATE ROLE immog_backup WITH LOGIN;
        RAISE NOTICE 'Created role: immog_backup';
    END IF;
END
$$;

-- Set passwords from secrets (executed after container starts)
-- Passwords are set via environment variables in the init script below

-- Grant privileges to immog_user (main user - already exists, has DDL)
-- This is the POSTGRES_USER, created by PostgreSQL on init

-- ============================================
-- Application Role Privileges (immog_app)
-- ============================================
-- Can: SELECT, INSERT, UPDATE, DELETE
-- Cannot: CREATE, DROP, ALTER, TRUNCATE

-- Grant CONNECT
GRANT CONNECT ON DATABASE immog_db TO immog_app;

-- Grant USAGE on public schema
GRANT USAGE ON SCHEMA public TO immog_app;

-- Grant DML on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO immog_app;

-- Grant USAGE on sequences (for auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO immog_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO immog_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO immog_app;

-- Explicitly REVOKE dangerous operations from app role
REVOKE CREATE ON SCHEMA public FROM immog_app;
REVOKE ALL ON DATABASE immog_db FROM immog_app;
GRANT CONNECT ON DATABASE immog_db TO immog_app;

-- ============================================
-- Backup Role Privileges (immog_backup)
-- ============================================
-- Can: SELECT only
-- Cannot: INSERT, UPDATE, DELETE, DDL

GRANT CONNECT ON DATABASE immog_db TO immog_backup;
GRANT USAGE ON SCHEMA public TO immog_backup;

-- Read-only access
GRANT SELECT ON ALL TABLES IN SCHEMA public TO immog_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO immog_backup;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO immog_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON SEQUENCES TO immog_backup;

-- Explicitly ensure no write access
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM immog_backup;
REVOKE CREATE ON SCHEMA public FROM immog_backup;

-- ============================================
-- Logging & Audit
-- ============================================
COMMENT ON ROLE immog_app IS 'Application runtime role - DML only (SELECT, INSERT, UPDATE, DELETE)';
COMMENT ON ROLE immog_backup IS 'Backup and monitoring role - Read-only access';

-- Log successful setup
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'PostgreSQL Role Separation Complete';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Roles created:';
    RAISE NOTICE '  - immog_user: DDL access (migrations)';
    RAISE NOTICE '  - immog_app: DML access (application)';
    RAISE NOTICE '  - immog_backup: Read-only (backups)';
    RAISE NOTICE '============================================';
END
$$;
