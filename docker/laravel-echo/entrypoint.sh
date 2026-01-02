#!/bin/sh
# Laravel Echo Server entrypoint - Load credentials from Docker secrets
set -e

echo "[laravel-echo-entrypoint] Loading secrets..."

# Load Redis password from secret if available
if [ -f "/run/secrets/redis_password" ]; then
    export REDIS_PASSWORD="$(cat /run/secrets/redis_password)"
    echo "[laravel-echo-entrypoint] Loaded REDIS_PASSWORD from secret"
fi

# Load Reverb keys from secrets if available
if [ -f "/run/secrets/reverb_app_key" ]; then
    export REVERB_APP_KEY="$(cat /run/secrets/reverb_app_key)"
    echo "[laravel-echo-entrypoint] Loaded REVERB_APP_KEY from secret"
fi

if [ -f "/run/secrets/reverb_app_secret" ]; then
    export REVERB_APP_SECRET="$(cat /run/secrets/reverb_app_secret)"
    echo "[laravel-echo-entrypoint] Loaded REVERB_APP_SECRET from secret"
fi

echo "[laravel-echo-entrypoint] Starting Laravel Echo Server..."

# Execute the original command
exec laravel-echo-server start
