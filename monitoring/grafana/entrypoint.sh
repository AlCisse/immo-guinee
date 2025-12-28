#!/bin/sh
# Read password from secret file and substitute in datasource config
# Using db_backup_password (read-only user) for security
if [ -f /run/secrets/db_backup_password ]; then
    DB_PASSWORD=$(cat /run/secrets/db_backup_password)
    export DB_PASSWORD

    # Create writable provisioning directory structure
    mkdir -p /tmp/provisioning/datasources
    mkdir -p /tmp/provisioning/dashboards

    # Copy datasource files and substitute the password using sed
    for f in /etc/grafana/provisioning/datasources/*.yml; do
        if [ -f "$f" ]; then
            sed "s/\${DB_PASSWORD}/$DB_PASSWORD/g" "$f" > "/tmp/provisioning/datasources/$(basename $f)"
        fi
    done

    # Copy all dashboard files and configs
    cp /etc/grafana/provisioning/dashboards/* /tmp/provisioning/dashboards/ 2>/dev/null || true

    # Tell Grafana to use our substituted provisioning directory
    export GF_PATHS_PROVISIONING=/tmp/provisioning

    echo "DB_PASSWORD substituted, using provisioning from /tmp/provisioning"
fi

# Execute the original Grafana entrypoint
exec /run.sh "$@"
