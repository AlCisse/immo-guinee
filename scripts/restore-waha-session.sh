#!/bin/bash
# Restore WAHA session data to production
# Usage: ./scripts/restore-waha-session.sh [backup-file]

set -e

BACKUP_DIR="./backups/waha"

if [ -z "$1" ]; then
    # Use latest backup
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/waha-session-*.tar.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo "Error: No backup files found in $BACKUP_DIR"
        exit 1
    fi
else
    BACKUP_FILE="$1"
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "=== WAHA Session Restore ==="
echo "Restoring from: $BACKUP_FILE"

# Stop WAHA service
echo "Stopping WAHA service..."
ssh immoguinee "docker service scale immog_waha=0"
sleep 5

# Restore backup
echo "Restoring session data..."
cat "$BACKUP_FILE" | ssh immoguinee "docker run --rm -i \
  -v immog_waha-data:/data \
  -v immog_waha-sessions:/sessions \
  alpine sh -c 'cd / && tar xzf -'"

# Restart WAHA service
echo "Restarting WAHA service..."
ssh immoguinee "docker service scale immog_waha=1"

echo "Waiting for service to start..."
sleep 30

# Check session status
echo "Checking session status..."
ssh immoguinee "docker exec \$(docker ps -q -f name=immog_waha) sh -c 'curl -s http://localhost:3000/api/sessions -H \"X-Api-Key: \$(cat /run/secrets/waha_api_key)\"'" | jq

echo "Done!"
