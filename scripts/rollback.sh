#!/usr/bin/env bash
set -euo pipefail

ROOT="${AI_PLATFORM_ROOT:-/opt/ai-platform}"
DEPLOY="${ROOT}/deploy"
STATE="${ROOT}/backups/deploy-state"

if [[ ! -f "${STATE}/previous-image" ]]; then
  echo "no previous image recorded; aborting. Database is left untouched." >&2
  exit 1
fi

PREV="$(cat "${STATE}/previous-image")"
if [[ -z "${PREV}" || "${PREV}" == ":" ]]; then
  echo "previous image tag empty; aborting" >&2
  exit 1
fi

echo "Rolling back application image to ${PREV}"
echo "This script does not drop volumes or restore MySQL automatically."
echo "To restore a SQL dump, follow docs/RESTORE.md"

cd "${DEPLOY}"
IMAGE_NAME="${PREV%%:*}"
IMAGE_TAG="${PREV#*:}"
tmp_env="$(mktemp)"
trap 'rm -f "${tmp_env}"' EXIT
grep -vE '^(IMAGE_NAME|IMAGE_TAG)=' .env > "${tmp_env}" || true
{
  cat "${tmp_env}"
  echo "IMAGE_NAME=${IMAGE_NAME}"
  echo "IMAGE_TAG=${IMAGE_TAG}"
} > .env.new
mv .env.new .env
chmod 600 .env

if [[ -f "${STATE}/previous-compose.yml" ]]; then
  cp "${STATE}/previous-compose.yml" docker-compose.yml
fi

docker compose --env-file .env up -d
"${ROOT}/scripts/healthcheck.sh"
echo "rollback complete; database was not modified"
