#!/bin/bash
# ===============================================
# Complete Backup Script for ImmoGuinee
# Backs up: PostgreSQL, Redis, WAHA sessions
# ===============================================

set -e

BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [BACKUP]"

mkdir -p "$BACKUP_DIR"

echo "$LOG_PREFIX Starting complete backup..."

# =============================================
# 1. PostgreSQL Backup
# =============================================
echo "$LOG_PREFIX Backing up PostgreSQL..."
PG_CONTAINER=$(docker ps -q -f name=immog_postgres | head -1)
PG_BACKUP_FILE="$BACKUP_DIR/postgres_${DATE}.sql.gz"

if [ -n "$PG_CONTAINER" ]; then
    docker exec "$PG_CONTAINER" pg_dump -U immog_user -d immog_db --no-owner --no-privileges | gzip > "$PG_BACKUP_FILE"
    PG_SIZE=$(du -h "$PG_BACKUP_FILE" | cut -f1)
    echo "$LOG_PREFIX PostgreSQL backup complete: $PG_BACKUP_FILE ($PG_SIZE)"
else
    echo "$LOG_PREFIX ERROR: PostgreSQL container not found"
fi

# =============================================
# 2. Redis Backup (RDB snapshot)
# =============================================
echo "$LOG_PREFIX Backing up Redis..."
REDIS_BACKUP_FILE="$BACKUP_DIR/redis_${DATE}.rdb"

if sudo cp /var/lib/docker/volumes/immog_redis-data/_data/dump.rdb "$REDIS_BACKUP_FILE" 2>/dev/null; then
    REDIS_SIZE=$(du -h "$REDIS_BACKUP_FILE" | cut -f1)
    echo "$LOG_PREFIX Redis backup complete: $REDIS_BACKUP_FILE ($REDIS_SIZE)"
else
    echo "$LOG_PREFIX WARNING: Could not backup Redis (may require sudo)"
fi

# =============================================
# 3. WAHA Sessions Backup
# =============================================
echo "$LOG_PREFIX Backing up WAHA sessions..."
WAHA_BACKUP_FILE="$BACKUP_DIR/waha_sessions_${DATE}.tar.gz"

if sudo tar -czf "$WAHA_BACKUP_FILE" -C /var/lib/docker/volumes/immog_waha-sessions/_data . 2>/dev/null; then
    WAHA_SIZE=$(du -h "$WAHA_BACKUP_FILE" | cut -f1)
    echo "$LOG_PREFIX WAHA sessions backup complete: $WAHA_BACKUP_FILE ($WAHA_SIZE)"
else
    echo "$LOG_PREFIX WARNING: Could not backup WAHA sessions (may require sudo)"
fi

# =============================================
# 4. Cleanup old backups (keep last 7 days)
# =============================================
echo "$LOG_PREFIX Cleaning up old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "postgres_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "redis_*.rdb" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "waha_sessions_*.tar.gz" -mtime +7 -delete 2>/dev/null || true

# =============================================
# Summary
# =============================================
echo ""
echo "$LOG_PREFIX ========== BACKUP COMPLETE =========="
echo "$LOG_PREFIX Backup directory: $BACKUP_DIR"
echo "$LOG_PREFIX Files created:"
ls -lh "$BACKUP_DIR"/*_${DATE}* 2>/dev/null || echo "No files created"
echo "$LOG_PREFIX ======================================"
