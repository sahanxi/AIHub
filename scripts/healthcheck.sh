#!/usr/bin/env bash
set -euo pipefail

ROOT="${AI_PLATFORM_ROOT:-/opt/ai-platform}"
DEPLOY="${ROOT}/deploy"
cd "${DEPLOY}"

set -a
# shellcheck disable=SC1091
source .env
set +a

docker compose --env-file .env ps
docker compose --env-file .env exec -T mysql mysqladmin ping -uroot -p"${MYSQL_ROOT_PASSWORD}" --silent
docker compose --env-file .env exec -T redis redis-cli -a "${REDIS_PASSWORD}" ping
curl -fsS http://127.0.0.1:3000/api/status | grep -q '"success"'
echo "healthcheck ok"
