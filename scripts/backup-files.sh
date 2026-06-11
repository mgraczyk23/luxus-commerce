#!/bin/bash
# Monthly project file backup for Luxus Commerce
# Backs up source code for both repos, excluding node_modules and build artifacts.
# .env files (not in git) are included — they're the most important thing here.
# Run manually or via cron: 0 4 1 * * /home/ubuntu/luxus-commerce/scripts/backup-files.sh >> /var/log/luxus-backup.log 2>&1
set -euo pipefail

BACKUP_BUCKET="s3://luxus-collection-backups"
BACKUP_DIR="/home/ubuntu/luxus-commerce/backups"
DATE=$(date +%Y-%m-%d)
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

log() { echo "$LOG_PREFIX $*"; }
die() { echo "$LOG_PREFIX ERROR: $*" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
log "Starting monthly file backup (date: $DATE)"

# Write tarballs to /tmp first to avoid "file changed as we read it" when
# the output file is inside the directory being archived.
TMP_STORE="/tmp/storefront-$DATE.tar.gz"
TMP_COMM="/tmp/commerce-$DATE.tar.gz"

# ── Storefront (Next.js) ────────────────────────────────────────────────────
# Skip node_modules (628 MB) and .next build output (245 MB)

log "Archiving luxus-storefront..."
tar -czf "$TMP_STORE" \
  --exclude="./node_modules" \
  --exclude="./.next" \
  --exclude="./.git" \
  -C /home/ubuntu/luxus-storefront . \
  || die "Storefront tar failed"
mv "$TMP_STORE" "$BACKUP_DIR/storefront-$DATE.tar.gz"
log "  storefront: $(du -sh "$BACKUP_DIR/storefront-$DATE.tar.gz" | cut -f1)"

# ── Commerce backend (Medusa + Payload) ────────────────────────────────────
# Skip all node_modules (~1.9 GB total) and .next build output (78 MB)
# Keep: source code, scripts, docker-compose.yml, .env files, nginx config

log "Archiving luxus-commerce..."
tar -czf "$TMP_COMM" \
  --exclude="./services/medusa/node_modules" \
  --exclude="./services/payload/node_modules" \
  --exclude="./services/payload/.next" \
  --exclude="./services/mcp-server/node_modules" \
  --exclude="./.git" \
  --exclude="./backups" \
  -C /home/ubuntu/luxus-commerce . \
  || die "Commerce tar failed"
mv "$TMP_COMM" "$BACKUP_DIR/commerce-$DATE.tar.gz"
log "  commerce: $(du -sh "$BACKUP_DIR/commerce-$DATE.tar.gz" | cut -f1)"

# ── Upload to S3 — monthly/ prefix ─────────────────────────────────────────

log "Uploading to S3 (monthly/)..."
aws s3 cp "$BACKUP_DIR/storefront-$DATE.tar.gz" "$BACKUP_BUCKET/monthly/" \
  || die "S3 upload failed (storefront)"
aws s3 cp "$BACKUP_DIR/commerce-$DATE.tar.gz"   "$BACKUP_BUCKET/monthly/" \
  || die "S3 upload failed (commerce)"
log "  Uploaded to $BACKUP_BUCKET/monthly/"

# ── Prune monthly/ on S3 — keep last 12 months ─────────────────────────────

log "Pruning S3 monthly/ (keeping 12 months)..."
CUTOFF=$(date -d '365 days ago' +%Y-%m-%d)
while IFS= read -r line; do
  fname=$(echo "$line" | awk '{print $4}')
  file_date=$(echo "$fname" | grep -oP '\d{4}-\d{2}-\d{2}' | head -1 || true)
  if [ -n "$file_date" ] && [[ "$file_date" < "$CUTOFF" ]]; then
    aws s3 rm "$BACKUP_BUCKET/monthly/$fname"
    log "  Removed old monthly: $fname"
  fi
done < <(aws s3 ls "$BACKUP_BUCKET/monthly/" 2>/dev/null || true)

# ── Clean up local copies ───────────────────────────────────────────────────

rm -f "$BACKUP_DIR/storefront-$DATE.tar.gz" "$BACKUP_DIR/commerce-$DATE.tar.gz"
log "  Local tarballs removed."

log "Monthly file backup completed successfully."
