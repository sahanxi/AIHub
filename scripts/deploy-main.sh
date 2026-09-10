#!/usr/bin/env bash
set -euo pipefail

# Non-interactive deploy for /opt/ai-platform on Tokyo host.
ROOT="${AI_PLATFORM_ROOT:-/opt/ai-platform}"
SRC="${ROOT}/src/new-api"
DEPLOY="${ROOT}/deploy"
STATE="${ROOT}/backups/deploy-state"

cd "${SRC}"
git fetch origin
git checkout main
git pull origin main

SHA="$(git rev-parse --short HEAD)"
IMAGE="ai-platform-newapi:v1-${SHA}"

if [[ -x "${ROOT}/scripts/backup.sh" ]]; then
  "${ROOT}/scripts/backup.sh"
fi

mkdir -p "${STATE}"
if [[ -f "${DEPLOY}/.env" ]]; then
  # shellcheck disable=SC1091
  source "${DEPLOY}/.env"
  echo "${IMAGE_NAME:-ai-platform-newapi}:${IMAGE_TAG:-}" > "${STATE}/previous-image"
fi
cp "${DEPLOY}/docker-compose.yml" "${STATE}/previous-compose.yml"

docker build -t "${IMAGE}" "${SRC}"

cd "${DEPLOY}"
tmp_env="$(mktemp)"
trap 'rm -f "${tmp_env}"' EXIT
grep -v '^IMAGE_TAG=' .env > "${tmp_env}" || true
{
  cat "${tmp_env}"
  echo "IMAGE_NAME=ai-platform-newapi"
  echo "IMAGE_TAG=v1-${SHA}"
} > .env.new
mv .env.new .env
chmod 600 .env

docker compose --env-file .env up -d
"${ROOT}/scripts/healthcheck.sh"
echo "deployed ${IMAGE}"
