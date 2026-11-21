#!/usr/bin/env bash
# Daily backup of the production database and uploaded files.
# Run from the repo root (e.g. cron: 30 3 * * * cd /srv/pricehub && deploy/backup.sh >> deploy/backups/backup.log 2>&1)
# Keeps the last KEEP_DAYS days. Copy deploy/backups/ off-site (rsync/rclone) — a backup on the
# same disk does not survive losing the server.
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml --env-file ${ENV_FILE:-.env.prod}"
DIR="deploy/backups"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DIR"

# Custom format: compressed, restorable with pg_restore (see mds/deployment.md).
$COMPOSE exec -T postgres pg_dump -U pricehub -d pricehub -Fc > "$DIR/db-$STAMP.dump"
# Uploaded price lists (only relevant when GCS is not used).
$COMPOSE exec -T api tar -C /data -czf - uploads > "$DIR/uploads-$STAMP.tar.gz"

find "$DIR" -name 'db-*.dump' -mtime +"$KEEP_DAYS" -delete
find "$DIR" -name 'uploads-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) backup ok: $DIR/db-$STAMP.dump ($(du -h "$DIR/db-$STAMP.dump" | cut -f1))"
