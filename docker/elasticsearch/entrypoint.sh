#!/bin/bash
# Elasticsearch entrypoint - Load credentials from Docker secrets
set -e

echo "[elasticsearch-entrypoint] Loading secrets..."

# Load Elasticsearch password from secret if available
if [ -f "/run/secrets/elasticsearch_password" ]; then
    export ELASTIC_PASSWORD="$(cat /run/secrets/elasticsearch_password)"
    echo "[elasticsearch-entrypoint] Loaded ELASTIC_PASSWORD from secret"
fi

echo "[elasticsearch-entrypoint] Starting Elasticsearch..."

# Execute the original entrypoint
exec /usr/local/bin/docker-entrypoint.sh "$@"
