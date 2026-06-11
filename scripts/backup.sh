#!/bin/bash
# PostgreSQL backup script for Luxus Commerce
# Runs daily via cron. Keeps 30 days of daily backups on S3, 90 days of weekly.
# Media files (images) are already stored on S3 and do not need separate backup.
set -euo pipefail

BACKUP_BUCKET="s3://luxus-collection-backups"
BACKUP_DIR="/home/ubuntu/luxus-commerce/backups"
DATE=$(date +%Y-%m-%d_%H-%M)
DAY_OF_WEEK=$(date +%u)  # 1=Mon … 7=Sun
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

log() { echo "$LOG_PREFIX $*"; }
die() { echo "$LOG_PREFIX ERROR: $*" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
log "Starting backup (date: $DATE)"

# ── Database dumps ───────────────────────────────────────────────────────────

log "Dumping luxus_medusa..."
docker exec luxus-postgres pg_dump -U luxus_admin luxus_medusa \
  | gzip > "$BACKUP_DIR/medusa-db-$DATE.sql.gz" \
  || die "Medusa pg_dump failed"
log "  luxus_medusa: $(du -sh "$BACKUP_DIR/medusa-db-$DATE.sql.gz" | cut -f1)"

log "Dumping luxus_payload..."
docker exec luxus-postgres pg_dump -U luxus_admin luxus_payload \
  | gzip > "$BACKUP_DIR/payload-db-$DATE.sql.gz" \
  || die "Payload pg_dump failed"
log "  luxus_payload: $(du -sh "$BACKUP_DIR/payload-db-$DATE.sql.gz" | cut -f1)"

# ── Upload to S3 — daily prefix ──────────────────────────────────────────────

log "Uploading to S3 (daily/)..."
aws s3 cp "$BACKUP_DIR/medusa-db-$DATE.sql.gz"  "$BACKUP_BUCKET/daily/" \
  || die "S3 upload failed (medusa-db)"
aws s3 cp "$BACKUP_DIR/payload-db-$DATE.sql.gz" "$BACKUP_BUCKET/daily/" \
  || die "S3 upload failed (payload-db)"
log "  Uploaded to $BACKUP_BUCKET/daily/"

# ── Weekly snapshot (every Sunday) ──────────────────────────────────────────

if [ "$DAY_OF_WEEK" -eq 7 ]; then
  WEEK=$(date +%Y-W%V)
  log "Sunday — copying to weekly/ ($WEEK)..."
  aws s3 cp "$BACKUP_DIR/medusa-db-$DATE.sql.gz"  "$BACKUP_BUCKET/weekly/medusa-db-$WEEK.sql.gz"
  aws s3 cp "$BACKUP_DIR/payload-db-$DATE.sql.gz" "$BACKUP_BUCKET/weekly/payload-db-$WEEK.sql.gz"
  log "  Weekly snapshots saved."
fi

# ── Clean up daily/ on S3 — keep last 30 days ────────────────────────────────

log "Pruning S3 daily/ (keeping 30 days)..."
CUTOFF=$(date -d '30 days ago' +%Y-%m-%d)
while IFS= read -r line; do
  fname=$(echo "$line" | awk '{print $4}')
  file_date=$(echo "$fname" | grep -oP '\d{4}-\d{2}-\d{2}' | head -1 || true)
  if [ -n "$file_date" ] && [[ "$file_date" < "$CUTOFF" ]]; then
    aws s3 rm "$BACKUP_BUCKET/daily/$fname"
    log "  Removed old daily: $fname"
  fi
done < <(aws s3 ls "$BACKUP_BUCKET/daily/" 2>/dev/null || true)

# ── Clean up weekly/ on S3 — keep last 90 days ───────────────────────────────

log "Pruning S3 weekly/ (keeping 90 days)..."
CUTOFF_WEEKLY=$(date -d '90 days ago' +%Y-%m-%d)
while IFS= read -r line; do
  fname=$(echo "$line" | awk '{print $4}')
  file_date=$(echo "$fname" | grep -oP '\d{4}-\d{2}-\d{2}' | head -1 || true)
  if [ -n "$file_date" ] && [[ "$file_date" < "$CUTOFF_WEEKLY" ]]; then
    aws s3 rm "$BACKUP_BUCKET/weekly/$fname"
    log "  Removed old weekly: $fname"
  fi
done < <(aws s3 ls "$BACKUP_BUCKET/weekly/" 2>/dev/null || true)

# ── Clean up local files — keep last 3 days ──────────────────────────────────

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +3 -delete
log "  Local files older than 3 days removed."

log "Backup completed successfully."
