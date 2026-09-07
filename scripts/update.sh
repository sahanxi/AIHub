#!/usr/bin/env bash
set -euo pipefail

# Manual engine update. Never attach Watchtower.
ROOT="${AI_PLATFORM_ROOT:-/opt/ai-platform}"
SRC="${ROOT}/src/new-api"
DEPLOY="${ROOT}/deploy"
STATE="${ROOT}/backups/deploy-state"

cd "${SRC}"
git fetch upstream
echo "Review upstream/main before merging into product/v1."
echo "Then: backup, merge, test, build, deploy."

read -r -p "Type MERGE to merge upstream/main into the current branch: " confirm
if [[ "${confirm}" != "MERGE" ]]; then
  echo "aborted"
  exit 1
fi

"${ROOT}/scripts/backup.sh"

git merge upstream/main

echo "Run frontend/backend tests locally or on this host, then continue."
read -r -p "Type BUILD to build and deploy: " confirm_build
if [[ "${confirm_build}" != "BUILD" ]]; then
  echo "stopped after merge; deploy skipped"
  exit 1
fi

SHA="$(git rev-parse --short HEAD)"
IMAGE="ai-platform-newapi:v1-${SHA}"
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
