#!/bin/sh
# ===============================================
# MinIO → DigitalOcean Spaces Synchronization Script
# Syncs all buckets from MinIO to Spaces with deletion
# ===============================================

set -e

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [SYNC]"

echo "$LOG_PREFIX Starting MinIO → Spaces synchronization..."

# Read secrets
MINIO_ACCESS_KEY=$(cat /run/secrets/minio_access_key 2>/dev/null || echo "")
MINIO_SECRET_KEY=$(cat /run/secrets/minio_password 2>/dev/null || echo "")
DO_SPACES_ACCESS_KEY=$(cat /run/secrets/do_spaces_access_key 2>/dev/null || echo "")
DO_SPACES_SECRET_KEY=$(cat /run/secrets/do_spaces_secret_key 2>/dev/null || echo "")

# Validate secrets
if [ -z "$MINIO_ACCESS_KEY" ] || [ -z "$MINIO_SECRET_KEY" ]; then
    echo "$LOG_PREFIX ERROR: MinIO credentials not found"
    exit 1
fi

if [ -z "$DO_SPACES_ACCESS_KEY" ] || [ -z "$DO_SPACES_SECRET_KEY" ]; then
    echo "$LOG_PREFIX ERROR: DigitalOcean Spaces credentials not found"
    exit 1
fi

# Create rclone config with actual secrets
cat > /tmp/rclone.conf << EOF
[minio]
type = s3
provider = Minio
endpoint = http://minio:9000
access_key_id = ${MINIO_ACCESS_KEY}
secret_access_key = ${MINIO_SECRET_KEY}
env_auth = false

[spaces]
type = s3
provider = DigitalOcean
endpoint = fra1.digitaloceanspaces.com
access_key_id = ${DO_SPACES_ACCESS_KEY}
secret_access_key = ${DO_SPACES_SECRET_KEY}
acl = public-read
env_auth = false
EOF

# Sync listings bucket (property images)
echo "$LOG_PREFIX Syncing listings bucket..."
rclone sync minio:listings spaces:immoguinee/listings \
    --config /tmp/rclone.conf \
    --s3-no-check-bucket \
    --progress \
    --delete-during \
    --transfers 8 \
    --checkers 16 \
    --log-level INFO

# Sync documents bucket (contracts, etc)
echo "$LOG_PREFIX Syncing documents bucket..."
rclone sync minio:documents spaces:immoguinee/documents \
    --config /tmp/rclone.conf \
    --s3-no-check-bucket \
    --progress \
    --delete-during \
    --transfers 4 \
    --checkers 8 \
    --log-level INFO

# Sync avatars bucket (user profile pictures)
echo "$LOG_PREFIX Syncing avatars bucket..."
rclone sync minio:avatars spaces:immoguinee/avatars \
    --config /tmp/rclone.conf \
    --s3-no-check-bucket \
    --progress \
    --delete-during \
    --transfers 4 \
    --checkers 8 \
    --log-level INFO

# Clean up config file
rm -f /tmp/rclone.conf

echo "$LOG_PREFIX Synchronization completed successfully!"
