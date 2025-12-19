#!/bin/bash
# ===============================================
# MinIO Restore Script
# Restores files from DigitalOcean Spaces to MinIO
# Usage: ./restore-minio.sh [bucket_name]
# Example: ./restore-minio.sh listings
# ===============================================

set -e

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [RESTORE-MINIO]"

BUCKET=${1:-"all"}

echo "$LOG_PREFIX Starting MinIO restore..."

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

# Create rclone config
cat > /tmp/rclone.conf << EOF
[minio]
type = s3
provider = Minio
endpoint = http://immo_minio:9000
access_key_id = ${MINIO_ACCESS_KEY}
secret_access_key = ${MINIO_SECRET_KEY}
env_auth = false

[spaces]
type = s3
provider = DigitalOcean
endpoint = fra1.digitaloceanspaces.com
access_key_id = ${DO_SPACES_ACCESS_KEY}
secret_access_key = ${DO_SPACES_SECRET_KEY}
env_auth = false
EOF

restore_bucket() {
    local bucket=$1
    echo "$LOG_PREFIX Restoring bucket: $bucket"
    rclone sync spaces:immoguinee/${bucket} minio:${bucket} \
        --config /tmp/rclone.conf \
        --progress \
        --transfers 8 \
        --checkers 16 \
        --log-level INFO
    echo "$LOG_PREFIX Bucket $bucket restored successfully"
}

if [ "$BUCKET" = "all" ]; then
    echo "$LOG_PREFIX Restoring all buckets..."
    restore_bucket "listings"
    restore_bucket "documents"
    restore_bucket "avatars"
else
    restore_bucket "$BUCKET"
fi

rm -f /tmp/rclone.conf

echo "$LOG_PREFIX Restore completed successfully!"
