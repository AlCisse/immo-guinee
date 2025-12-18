#!/bin/sh
# Read password from secret file and export it
if [ -f /run/secrets/db_password ]; then
    export DB_PASSWORD=$(cat /run/secrets/db_password)
fi

# Execute the original Grafana entrypoint
exec /run.sh "$@"
