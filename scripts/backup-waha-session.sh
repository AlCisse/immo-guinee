#!/bin/bash
# Backup WAHA session data from production
# Usage: ./scripts/backup-waha-session.sh

set -e

BACKUP_DIR="./backups/waha"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/waha-session-${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "=== WAHA Session Backup ==="
echo "Backing up session data from production..."

# Create backup from production
ssh immoguinee "docker run --rm \
  -v immog_waha-data:/data:ro \
  -v immog_waha-sessions:/sessions:ro \
  alpine tar czf - -C / data sessions" > "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"
echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Keep only last 5 backups
echo "Cleaning old backups..."
ls -t "${BACKUP_DIR}"/waha-session-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm

echo "Done!"
