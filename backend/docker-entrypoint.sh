#!/bin/sh
set -e

# ==============================================
# Docker Entrypoint for PHP-FPM
# Reads secrets from files and exports them
# ==============================================

# Function to read secret from file
read_secret() {
    local var_name="$1"
    local file_var="${var_name}_FILE"

    # Get the file path from the _FILE variable
    eval file_path="\$$file_var"

    if [ -n "$file_path" ] && [ -f "$file_path" ]; then
        # Read the secret and export it
        export "$var_name"="$(cat "$file_path")"
        echo "[entrypoint] Loaded secret: $var_name from $file_path"
    fi
}

# Read all secrets from files
echo "[entrypoint] Loading secrets from files..."

# Debug: Check if DB_PASSWORD_FILE is set
echo "[entrypoint] DB_PASSWORD_FILE=$DB_PASSWORD_FILE"
if [ -f "$DB_PASSWORD_FILE" ]; then
    echo "[entrypoint] File exists: $DB_PASSWORD_FILE"
else
    echo "[entrypoint] File NOT found: $DB_PASSWORD_FILE"
fi

read_secret "DB_PASSWORD"
read_secret "REDIS_PASSWORD"
read_secret "AWS_SECRET_ACCESS_KEY"
read_secret "APP_KEY"
read_secret "JWT_SECRET"
read_secret "PASSPORT_PERSONAL_ACCESS_CLIENT_ID"
read_secret "PASSPORT_PERSONAL_ACCESS_CLIENT_SECRET"
read_secret "REVERB_APP_KEY"
read_secret "REVERB_APP_SECRET"

# Read Passport keys (multiline content)
if [ -f "/run/secrets/passport_private_key" ]; then
    export PASSPORT_PRIVATE_KEY="$(cat /run/secrets/passport_private_key)"
    echo "[entrypoint] Loaded secret: PASSPORT_PRIVATE_KEY"
fi

if [ -f "/run/secrets/passport_public_key" ]; then
    export PASSPORT_PUBLIC_KEY="$(cat /run/secrets/passport_public_key)"
    echo "[entrypoint] Loaded secret: PASSPORT_PUBLIC_KEY"
fi

echo "[entrypoint] Secrets loaded successfully"

# Copy Passport keys to storage (Laravel Passport reads from these files)
if [ -f "/run/secrets/passport_private_key" ]; then
    cp /run/secrets/passport_private_key /var/www/backend/storage/oauth-private.key
    chmod 600 /var/www/backend/storage/oauth-private.key
    echo "[entrypoint] Copied oauth-private.key"
fi

if [ -f "/run/secrets/passport_public_key" ]; then
    cp /run/secrets/passport_public_key /var/www/backend/storage/oauth-public.key
    chmod 600 /var/www/backend/storage/oauth-public.key
    echo "[entrypoint] Copied oauth-public.key"
fi

# Configure PHP-FPM to pass environment variables
PHP_FPM_CONF="/usr/local/etc/php-fpm.d/www.conf"
if [ -f "$PHP_FPM_CONF" ]; then
    # Enable clear_env = no so PHP-FPM inherits environment variables
    # Use temp file to avoid "Device or resource busy" error
    if grep -q "clear_env = no" "$PHP_FPM_CONF"; then
        echo "[entrypoint] PHP-FPM already configured"
    else
        cp "$PHP_FPM_CONF" /tmp/www.conf.tmp
        sed 's/;*clear_env = .*/clear_env = no/' /tmp/www.conf.tmp > /tmp/www.conf.new
        cat /tmp/www.conf.new > "$PHP_FPM_CONF"
        rm -f /tmp/www.conf.tmp /tmp/www.conf.new
        echo "[entrypoint] PHP-FPM configured to inherit env vars"
    fi
fi

# Execute the main command
exec "$@"
