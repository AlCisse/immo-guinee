#!/bin/bash
# ===============================================
# Complete Restore Script for ImmoGuinee
# Restores: PostgreSQL, Redis, WAHA sessions
# ===============================================

set -e

BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [RESTORE]"

echo "$LOG_PREFIX ImmoGuinee Restore Script"
echo ""

# =============================================
# List available backups
# =============================================
list_backups() {
    echo "Available PostgreSQL backups:"
    ls -lh "$BACKUP_DIR"/postgres_*.sql.gz 2>/dev/null | tail -10 || echo "  No PostgreSQL backups found"
    echo ""
    echo "Available Redis backups:"
    ls -lh "$BACKUP_DIR"/redis_*.rdb 2>/dev/null | tail -10 || echo "  No Redis backups found"
    echo ""
    echo "Available WAHA backups:"
    ls -lh "$BACKUP_DIR"/waha_sessions_*.tar.gz 2>/dev/null | tail -10 || echo "  No WAHA backups found"
}

# =============================================
# Restore PostgreSQL
# =============================================
restore_postgres() {
    local BACKUP_FILE="$1"

    if [ -z "$BACKUP_FILE" ]; then
        echo "Usage: $0 postgres <backup_file>"
        echo ""
        echo "Available PostgreSQL backups:"
        ls -lh "$BACKUP_DIR"/postgres_*.sql.gz 2>/dev/null | tail -10
        exit 1
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        echo "$LOG_PREFIX ERROR: Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    echo "$LOG_PREFIX WARNING: This will overwrite the current database!"
    read -p "Continue? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "$LOG_PREFIX Restore cancelled"
        exit 0
    fi

    echo "$LOG_PREFIX Restoring PostgreSQL from: $BACKUP_FILE"
    PG_CONTAINER=$(docker ps -q -f name=immog_postgres | head -1)

    if [ -n "$PG_CONTAINER" ]; then
        gunzip -c "$BACKUP_FILE" | docker exec -i "$PG_CONTAINER" psql -U immog_user -d immog_db -q 2>&1 | grep -v "already exists" || true
        echo "$LOG_PREFIX PostgreSQL restore complete!"

        # Verify
        echo "$LOG_PREFIX Verification:"
        docker exec "$PG_CONTAINER" psql -U immog_user -d immog_db -c "SELECT COUNT(*) as listings FROM listings; SELECT COUNT(*) as users FROM users;"
    else
        echo "$LOG_PREFIX ERROR: PostgreSQL container not found"
        exit 1
    fi
}

# =============================================
# Restore WAHA Sessions
# =============================================
restore_waha() {
    local BACKUP_FILE="$1"

    if [ -z "$BACKUP_FILE" ]; then
        echo "Usage: $0 waha <backup_file>"
        echo ""
        echo "Available WAHA backups:"
        ls -lh "$BACKUP_DIR"/waha_sessions_*.tar.gz 2>/dev/null | tail -10
        exit 1
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        echo "$LOG_PREFIX ERROR: Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    echo "$LOG_PREFIX WARNING: This will overwrite WAHA sessions!"
    read -p "Continue? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "$LOG_PREFIX Restore cancelled"
        exit 0
    fi

    echo "$LOG_PREFIX Stopping WAHA service..."
    docker service scale immog_waha=0 || true
    sleep 5

    echo "$LOG_PREFIX Restoring WAHA sessions from: $BACKUP_FILE"
    sudo rm -rf /var/lib/docker/volumes/immog_waha-sessions/_data/*
    sudo tar -xzf "$BACKUP_FILE" -C /var/lib/docker/volumes/immog_waha-sessions/_data/

    echo "$LOG_PREFIX Starting WAHA service..."
    docker service scale immog_waha=1
    sleep 30

    echo "$LOG_PREFIX WAHA restore complete!"

    # Verify
    echo "$LOG_PREFIX Checking WAHA session..."
    docker exec $(docker ps -q -f name=immog_php | head -1) php artisan waha:ensure-session 2>&1 || true
}

# =============================================
# Main
# =============================================
case "$1" in
    list)
        list_backups
        ;;
    postgres)
        restore_postgres "$2"
        ;;
    waha)
        restore_waha "$2"
        ;;
    *)
        echo "Usage: $0 {list|postgres|waha} [backup_file]"
        echo ""
        echo "Commands:"
        echo "  list              - List available backups"
        echo "  postgres <file>   - Restore PostgreSQL from backup"
        echo "  waha <file>       - Restore WAHA sessions from backup"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 postgres postgres_2025-12-20_12-00-00.sql.gz"
        echo "  $0 waha waha_sessions_2025-12-20_12-00-00.tar.gz"
        exit 1
        ;;
esac
