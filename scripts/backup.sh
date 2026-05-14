#!/bin/bash
set -euo pipefail

S3_BUCKET="s3://luxus-collection-backups"
DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_DIR="/home/ubuntu/luxus-commerce/backups"

mkdir -p $BACKUP_DIR
echo "[$DATE] Starting backup..."

docker exec luxus-postgres pg_dump -U luxus_admin luxus_medusa | \
  gzip > $BACKUP_DIR/medusa-db-$DATE.sql.gz
echo "  Medusa database dumped."

docker exec luxus-postgres pg_dump -U luxus_admin luxus_payload | \
  gzip > $BACKUP_DIR/payload-db-$DATE.sql.gz
echo "  Payload database dumped."

docker run --rm -v luxus-commerce_medusa_uploads:/data \
  -v $BACKUP_DIR:/backup alpine tar -czf /backup/medusa-uploads-$DATE.tar.gz -C /data .
echo "  Medusa uploads archived."

docker run --rm -v luxus-commerce_payload_uploads:/data \
  -v $BACKUP_DIR:/backup alpine tar -czf /backup/payload-media-$DATE.tar.gz -C /data .
echo "  Payload media archived."

aws s3 cp $BACKUP_DIR/medusa-db-$DATE.sql.gz $S3_BUCKET/daily/
aws s3 cp $BACKUP_DIR/payload-db-$DATE.sql.gz $S3_BUCKET/daily/
aws s3 cp $BACKUP_DIR/medusa-uploads-$DATE.tar.gz $S3_BUCKET/daily/
aws s3 cp $BACKUP_DIR/payload-media-$DATE.tar.gz $S3_BUCKET/daily/
echo "  Uploaded to S3."

find $BACKUP_DIR -type f -mtime +7 -delete
echo "[$DATE] Backup completed."
