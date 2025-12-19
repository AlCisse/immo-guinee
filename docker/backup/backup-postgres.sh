#!/bin/bash
# ===============================================
# PostgreSQL Backup Script
# Creates encrypted backup and uploads to DigitalOcean Spaces
# Rotation: 14 days retention
# ===============================================

set -e

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [BACKUP]"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="immog_db_${DATE}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"

echo "$LOG_PREFIX Starting PostgreSQL backup..."

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

# Create rclone config for Spaces
cat > /tmp/rclone.conf << EOF
[spaces]
type = s3
provider = DigitalOcean
endpoint = fra1.digitaloceanspaces.com
access_key_id = ${DO_SPACES_ACCESS_KEY}
secret_access_key = ${DO_SPACES_SECRET_KEY}
acl = private
env_auth = false
EOF

# Create temporary encryption key file
echo "$BACKUP_ENCRYPTION_KEY" > /tmp/encryption_key
chmod 600 /tmp/encryption_key

echo "$LOG_PREFIX Dumping database..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h immo_postgres \
    -U immog_user \
    -d immog_db \
    --no-owner \
    --no-privileges \
    | gzip > /tmp/${BACKUP_FILE}

BACKUP_SIZE=$(du -h /tmp/${BACKUP_FILE} | cut -f1)
echo "$LOG_PREFIX Database dump completed. Size: ${BACKUP_SIZE}"

echo "$LOG_PREFIX Encrypting backup with AES-256..."
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
    -in /tmp/${BACKUP_FILE} \
    -out /tmp/${ENCRYPTED_FILE} \
    -pass file:/tmp/encryption_key

ENCRYPTED_SIZE=$(du -h /tmp/${ENCRYPTED_FILE} | cut -f1)
echo "$LOG_PREFIX Encryption completed. Size: ${ENCRYPTED_SIZE}"

echo "$LOG_PREFIX Uploading to DigitalOcean Spaces..."
rclone copy /tmp/${ENCRYPTED_FILE} spaces:immoguinee/backups/db/ \
    --config /tmp/rclone.conf \
    --s3-no-check-bucket \
    --progress \
    --log-level INFO

echo "$LOG_PREFIX Upload completed: backups/db/${ENCRYPTED_FILE}"

echo "$LOG_PREFIX Applying retention policy (14 days)..."
rclone delete spaces:immoguinee/backups/db/ \
    --config /tmp/rclone.conf \
    --s3-no-check-bucket \
    --min-age 14d \
    2>/dev/null || true

echo "$LOG_PREFIX Cleaning up local files..."
rm -f /tmp/${BACKUP_FILE} /tmp/${ENCRYPTED_FILE} /tmp/rclone.conf /tmp/encryption_key

echo "$LOG_PREFIX Backup completed successfully!"
echo "$LOG_PREFIX File: ${ENCRYPTED_FILE}"
echo "$LOG_PREFIX Location: spaces:immoguinee/backups/db/"
