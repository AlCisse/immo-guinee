#!/bin/sh
# Laravel Reverb entrypoint - Load credentials from Docker secrets
set -e

echo "[reverb-entrypoint] Loading secrets..."

# Load App Key from secret
if [ -f "/run/secrets/app_key" ]; then
    export APP_KEY="$(cat /run/secrets/app_key)"
    echo "[reverb-entrypoint] Loaded APP_KEY from secret"
fi

# Load DB password from secret
if [ -f "/run/secrets/db_app_password" ]; then
    export DB_PASSWORD="$(cat /run/secrets/db_app_password)"
    echo "[reverb-entrypoint] Loaded DB_PASSWORD from secret"
fi

# Load Redis password from secret
if [ -f "/run/secrets/redis_password" ]; then
    export REDIS_PASSWORD="$(cat /run/secrets/redis_password)"
    echo "[reverb-entrypoint] Loaded REDIS_PASSWORD from secret"
fi

# Load Reverb keys from secrets
if [ -f "/run/secrets/reverb_app_key" ]; then
    export REVERB_APP_KEY="$(cat /run/secrets/reverb_app_key)"
    echo "[reverb-entrypoint] Loaded REVERB_APP_KEY from secret"
fi

if [ -f "/run/secrets/reverb_app_secret" ]; then
    export REVERB_APP_SECRET="$(cat /run/secrets/reverb_app_secret)"
    echo "[reverb-entrypoint] Loaded REVERB_APP_SECRET from secret"
fi

echo "[reverb-entrypoint] Starting Laravel Reverb..."

# Execute the command
exec "$@"
