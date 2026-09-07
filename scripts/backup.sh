#!/usr/bin/env bash
set -euo pipefail

ROOT="${AI_PLATFORM_ROOT:-/opt/ai-platform}"
DEPLOY="${ROOT}/deploy"
BACKUP_DIR="${ROOT}/backups/mysql"
CONFIG_BACKUP_DIR="${ROOT}/backups/config"
KEEP="${BACKUP_KEEP:-7}"

mkdir -p "${BACKUP_DIR}" "${CONFIG_BACKUP_DIR}"
cd "${DEPLOY}"

if [[ ! -f .env ]]; then
  echo "missing ${DEPLOY}/.env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP="${BACKUP_DIR}/newapi-${STAMP}.sql.gz"

docker compose --env-file .env exec -T mysql \
  mysqldump \
    -u"${MYSQL_USER:-newapi}" \
    -p"${MYSQL_PASSWORD}" \
    --single-transaction \
    --routines \
    --databases "${MYSQL_DATABASE:-newapi}" \
  | gzip > "${DUMP}"

cp docker-compose.yml "${CONFIG_BACKUP_DIR}/docker-compose-${STAMP}.yml"
if [[ -d nginx ]]; then
  tar -czf "${CONFIG_BACKUP_DIR}/nginx-${STAMP}.tar.gz" nginx
fi

# Do not copy .env into the world-readable config backup.

ls -1t "${BACKUP_DIR}"/newapi-*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
ls -1t "${CONFIG_BACKUP_DIR}"/docker-compose-*.yml 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
ls -1t "${CONFIG_BACKUP_DIR}"/nginx-*.tar.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f

echo "backup written: ${DUMP}"
