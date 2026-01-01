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

read_secret "DB_PASSWORD"
read_secret "REDIS_PASSWORD"
read_secret "AWS_SECRET_ACCESS_KEY"
read_secret "APP_KEY"
read_secret "JWT_SECRET"
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

# Execute the main command
exec "$@"
