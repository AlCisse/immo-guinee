#!/bin/sh
# MinIO entrypoint - Load credentials from Docker secrets
set -e

echo "[minio-entrypoint] Loading secrets..."

# Load MinIO root user from secret if available
if [ -f "/run/secrets/minio_access_key" ]; then
    export MINIO_ROOT_USER="$(cat /run/secrets/minio_access_key)"
    echo "[minio-entrypoint] Loaded MINIO_ROOT_USER from secret"
fi

# Load MinIO root password from secret if available
if [ -f "/run/secrets/minio_password" ]; then
    export MINIO_ROOT_PASSWORD="$(cat /run/secrets/minio_password)"
    echo "[minio-entrypoint] Loaded MINIO_ROOT_PASSWORD from secret"
fi

echo "[minio-entrypoint] Starting MinIO server..."

# Execute the original command
exec minio "$@"
