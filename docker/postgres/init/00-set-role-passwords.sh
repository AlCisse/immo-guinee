#!/bin/bash
# ============================================
# Set PostgreSQL Role Passwords from Docker Secrets
# ============================================
# This script runs after PostgreSQL initializes and sets
# passwords for the separated roles from Docker secrets.
# ============================================

set -e

# Function to read password from secret file
read_secret() {
    local secret_file="/run/secrets/$1"
    if [ -f "$secret_file" ]; then
        cat "$secret_file"
    else
        echo ""
    fi
}

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

echo "Setting role passwords from Docker secrets..."

# Read passwords from secrets
APP_PASSWORD=$(read_secret "db_app_password")
BACKUP_PASSWORD=$(read_secret "db_backup_password")

# Set app role password if secret exists
if [ -n "$APP_PASSWORD" ]; then
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        ALTER ROLE immog_app WITH PASSWORD '$APP_PASSWORD';
        COMMENT ON ROLE immog_app IS 'Application runtime role - DML only - password set from secret';
EOSQL
    echo "Set password for immog_app from secret"
else
    echo "Warning: db_app_password secret not found, using fallback"
    # Fallback: generate random password (will be lost on restart)
    RANDOM_PASSWORD=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        ALTER ROLE immog_app WITH PASSWORD '$RANDOM_PASSWORD';
EOSQL
    echo "Set random password for immog_app (WARNING: not persisted)"
fi

# Set backup role password if secret exists
if [ -n "$BACKUP_PASSWORD" ]; then
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        ALTER ROLE immog_backup WITH PASSWORD '$BACKUP_PASSWORD';
        COMMENT ON ROLE immog_backup IS 'Backup role - Read-only - password set from secret';
EOSQL
    echo "Set password for immog_backup from secret"
else
    echo "Warning: db_backup_password secret not found, using fallback"
    RANDOM_PASSWORD=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        ALTER ROLE immog_backup WITH PASSWORD '$RANDOM_PASSWORD';
EOSQL
    echo "Set random password for immog_backup (WARNING: not persisted)"
fi

echo "============================================"
echo "PostgreSQL role passwords configured"
echo "============================================"
