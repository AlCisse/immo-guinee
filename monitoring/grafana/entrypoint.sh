#!/bin/sh
# Read password from secret file and export as environment variable
# Grafana uses $__env{VAR_NAME} syntax to read environment variables in provisioning files
if [ -f /run/secrets/db_password ]; then
    export DB_PASSWORD=$(cat /run/secrets/db_password)
fi

# Execute the original Grafana entrypoint
exec /run.sh "$@"
