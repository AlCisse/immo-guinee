# ImmoGuinee Backup & Sync System

## Overview

This system provides:
- **PostgreSQL Backup**: Daily encrypted backups to DigitalOcean Spaces
- **MinIO Sync**: 15-minute sync from MinIO to DigitalOcean Spaces
- **Restore Scripts**: Recovery from DigitalOcean Spaces

## Security Features

- AES-256 encryption for database backups
- Docker Secrets for all credentials (no .env in production)
- 14-day retention policy with automatic cleanup
- Private storage for backups, public for CDN images

## Required Docker Secrets

Create these secrets on the server before deployment:

```bash
# DigitalOcean Spaces credentials
echo "YOUR_ACCESS_KEY" | docker secret create do_spaces_access_key -
echo "YOUR_SECRET_KEY" | docker secret create do_spaces_secret_key -

# MinIO access key (same as MINIO_ROOT_USER)
echo "immog_minio" | docker secret create minio_access_key -

# Backup encryption key (generate once, store securely!)
openssl rand -base64 32 | docker secret create backup_encryption_key -
```

**IMPORTANT**: Save the backup_encryption_key somewhere secure! Without it, you cannot restore backups.

## Manual Operations

### Trigger PostgreSQL Backup
```bash
docker service scale immo_backup-postgres=1
docker service logs -f immo_backup-postgres
```

### Trigger MinIO → Spaces Sync
```bash
docker service scale immo_rclone-sync=1
docker service logs -f immo_rclone-sync
```

### Restore PostgreSQL from Backup
```bash
# List available backups
docker run --rm \
  -e RCLONE_CONFIG_SPACES_TYPE=s3 \
  -e RCLONE_CONFIG_SPACES_PROVIDER=DigitalOcean \
  -e RCLONE_CONFIG_SPACES_ENDPOINT=fra1.digitaloceanspaces.com \
  -e RCLONE_CONFIG_SPACES_ACCESS_KEY_ID=YOUR_KEY \
  -e RCLONE_CONFIG_SPACES_SECRET_ACCESS_KEY=YOUR_SECRET \
  rclone/rclone ls spaces:immoguinee/backups/db/

# Set the backup file to restore
export BACKUP_FILE="immog_db_2024-01-15_02-00-00.sql.gz.enc"

# Trigger restore
docker service scale immo_restore-postgres=1
docker service logs -f immo_restore-postgres
```

### Restore MinIO from Spaces
```bash
# Restore all buckets
docker service scale immo_restore-minio=1

# Or restore specific bucket
export RESTORE_BUCKET=listings
docker service scale immo_restore-minio=1
```

## Automatic Scheduling

The Laravel scheduler triggers backups at:
- **PostgreSQL Backup**: Daily at 02:00 UTC
- **MinIO Sync**: Every 15 minutes

The actual Docker service scaling is handled by trigger files in `storage/app/`.

## File Structure

```
docker/
├── backup/
│   ├── backup-postgres.sh      # PostgreSQL backup script
│   ├── restore-postgres.sh     # PostgreSQL restore script
│   ├── restore-minio.sh        # MinIO restore script
│   ├── cron-runner.sh          # Trigger file watcher
│   └── README.md               # This file
└── rclone/
    ├── rclone.conf.template    # rclone config template
    └── sync-to-spaces.sh       # MinIO → Spaces sync script
```

## Cloudflare CDN Setup

1. Create DNS CNAME record:
   ```
   images.immoguinee.com → immoguinee.fra1.cdn.digitaloceanspaces.com
   ```

2. Cloudflare Settings:
   - SSL/TLS: Full (strict)
   - Cache Level: Standard
   - Browser Cache TTL: 1 year
   - Always Use HTTPS: On

3. Page Rules for `images.immoguinee.com/*`:
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month

## Monitoring

Check backup logs:
```bash
docker service logs immo_backup-postgres
docker service logs immo_rclone-sync
```

Verify backups in Spaces:
```bash
# Via DigitalOcean Console or:
rclone ls spaces:immoguinee/backups/db/
```

## Disaster Recovery

1. **Database Loss**: Restore from latest encrypted backup in Spaces
2. **MinIO Loss**: Restore from Spaces mirror
3. **Complete Server Loss**:
   - Deploy new infrastructure
   - Create Docker secrets
   - Deploy stack
   - Restore database from Spaces
   - Restore MinIO from Spaces
