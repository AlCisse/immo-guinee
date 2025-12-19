#!/bin/bash
# ===============================================
# PostgreSQL Restore Script
# Downloads and decrypts backup from DigitalOcean Spaces
# Usage: ./restore-postgres.sh [backup_filename]
# Example: ./restore-postgres.sh immog_db_2024-01-15_02-00-00.sql.gz.enc
# ===============================================

set -e

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [RESTORE]"

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_filename>"
    echo "Example: $0 immog_db_2024-01-15_02-00-00.sql.gz.enc"
    echo ""
    echo "Available backups:"

    # List available backups
    DO_SPACES_ACCESS_KEY=$(cat /run/secrets/do_spaces_access_key 2>/dev/null || echo "")
    DO_SPACES_SECRET_KEY=$(cat /run/secrets/do_spaces_secret_key 2>/dev/null || echo "")

    if [ -n "$DO_SPACES_ACCESS_KEY" ] && [ -n "$DO_SPACES_SECRET_KEY" ]; then
        cat > /tmp/rclone.conf << EOF
[spaces]
type = s3
provider = DigitalOcean
endpoint = fra1.digitaloceanspaces.com
access_key_id = ${DO_SPACES_ACCESS_KEY}
secret_access_key = ${DO_SPACES_SECRET_KEY}
env_auth = false
EOF
        rclone ls spaces:immoguinee/backups/db/ --config /tmp/rclone.conf --s3-no-check-bucket 2>/dev/null | tail -10
        rm -f /tmp/rclone.conf
    fi
    exit 1
fi

BACKUP_FILE=$1

echo "$LOG_PREFIX Starting PostgreSQL restore from: $BACKUP_FILE"

# Read secrets
DB_PASSWORD=$(cat /run/secrets/db_password 2>/dev/null || echo "")
BACKUP_ENCRYPTION_KEY=$(cat /run/secrets/backup_encryption_key 2>/dev/null || echo "")
DO_SPACES_ACCESS_KEY=$(cat /run/secrets/do_spaces_access_key 2>/dev/null || echo "")
DO_SPACES_SECRET_KEY=$(cat /run/secrets/do_spaces_secret_key 2>/dev/null || echo "")

# Validate secrets
if [ -z "$DB_PASSWORD" ]; then
    echo "$LOG_PREFIX ERROR: Database password not found"
    exit 1
fi

if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
    echo "$LOG_PREFIX ERROR: Backup encryption key not found"
    exit 1
fi

if [ -z "$DO_SPACES_ACCESS_KEY" ] || [ -z "$DO_SPACES_SECRET_KEY" ]; then
    echo "$LOG_PREFIX ERROR: DigitalOcean Spaces credentials not found"
    exit 1
fi

# Create rclone config
cat > /tmp/rclone.conf << EOF
[spaces]
type = s3
provider = DigitalOcean
endpoint = fra1.digitaloceanspaces.com
access_key_id = ${DO_SPACES_ACCESS_KEY}
secret_access_key = ${DO_SPACES_SECRET_KEY}
env_auth = false
EOF

# Create temporary encryption key file
echo "$BACKUP_ENCRYPTION_KEY" > /tmp/encryption_key
chmod 600 /tmp/encryption_key

echo "$LOG_PREFIX Downloading backup from Spaces..."
rclone copy spaces:immoguinee/backups/db/${BACKUP_FILE} /tmp/ \
    --config /tmp/rclone.conf \
    --s3-no-check-bucket \
    --progress

if [ ! -f "/tmp/${BACKUP_FILE}" ]; then
    echo "$LOG_PREFIX ERROR: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "$LOG_PREFIX Decrypting backup..."
openssl enc -aes-256-cbc -d -pbkdf2 -iter 100000 \
    -in /tmp/${BACKUP_FILE} \
    -out /tmp/restore.sql.gz \
    -pass file:/tmp/encryption_key

echo "$LOG_PREFIX Restoring database..."
echo "$LOG_PREFIX WARNING: This will overwrite existing data!"

gunzip -c /tmp/restore.sql.gz | PGPASSWORD="$DB_PASSWORD" psql \
    -h immo_postgres \
    -U immog_user \
    -d immog_db

echo "$LOG_PREFIX Cleaning up..."
rm -f /tmp/${BACKUP_FILE} /tmp/restore.sql.gz /tmp/rclone.conf /tmp/encryption_key

echo "$LOG_PREFIX Restore completed successfully!"
