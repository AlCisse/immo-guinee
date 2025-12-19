#!/bin/bash
# ===============================================
# Cron Runner for Backup & Sync Tasks
# Watches for trigger files and executes Docker services
# This script runs in the scheduler container
# ===============================================

set -e

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-RUNNER]"
STORAGE_PATH="/var/www/backend/storage/app"

# Function to check and execute backup
check_backup_trigger() {
    if [ -f "${STORAGE_PATH}/backup-trigger" ]; then
        echo "$LOG_PREFIX Backup trigger detected"

        # Remove trigger file
        rm -f "${STORAGE_PATH}/backup-trigger"

        # Scale up backup service
        echo "$LOG_PREFIX Scaling up backup-postgres service..."
        docker service scale immo_backup-postgres=1 2>/dev/null || {
            echo "$LOG_PREFIX WARNING: Could not scale backup service (Docker not available)"
            return 1
        }

        # Wait for completion (max 30 minutes)
        timeout=1800
        while [ $timeout -gt 0 ]; do
            replicas=$(docker service ls --filter name=immo_backup-postgres --format "{{.Replicas}}" 2>/dev/null | cut -d'/' -f1)
            if [ "$replicas" = "0" ]; then
                echo "$LOG_PREFIX Backup service completed"
                break
            fi
            sleep 10
            timeout=$((timeout - 10))
        done

        # Scale down if still running
        docker service scale immo_backup-postgres=0 2>/dev/null || true

        echo "$LOG_PREFIX Backup task finished"
    fi
}

# Function to check and execute sync
check_sync_trigger() {
    if [ -f "${STORAGE_PATH}/sync-trigger" ]; then
        echo "$LOG_PREFIX Sync trigger detected"

        # Remove trigger file
        rm -f "${STORAGE_PATH}/sync-trigger"

        # Scale up sync service
        echo "$LOG_PREFIX Scaling up rclone-sync service..."
        docker service scale immo_rclone-sync=1 2>/dev/null || {
            echo "$LOG_PREFIX WARNING: Could not scale sync service (Docker not available)"
            return 1
        }

        # Wait for completion (max 15 minutes)
        timeout=900
        while [ $timeout -gt 0 ]; do
            replicas=$(docker service ls --filter name=immo_rclone-sync --format "{{.Replicas}}" 2>/dev/null | cut -d'/' -f1)
            if [ "$replicas" = "0" ]; then
                echo "$LOG_PREFIX Sync service completed"
                break
            fi
            sleep 10
            timeout=$((timeout - 10))
        done

        # Scale down if still running
        docker service scale immo_rclone-sync=0 2>/dev/null || true

        echo "$LOG_PREFIX Sync task finished"
    fi
}

# Main loop
echo "$LOG_PREFIX Starting cron runner..."

while true; do
    check_backup_trigger
    check_sync_trigger
    sleep 30
done
