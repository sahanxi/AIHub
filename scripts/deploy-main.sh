#!/usr/bin/env bash
set -euo pipefail

# Non-interactive deploy: git pull from GitHub, sync platform files, Docker build + up.
ROOT="${AI_PLATFORM_ROOT:-/opt/ai-platform}"
SRC="${ROOT}/src/new-api"
DEPLOY="${ROOT}/deploy"
SCRIPTS="${ROOT}/scripts"
STATE="${ROOT}/backups/deploy-state"
DEPLOY_KEY="${GITHUB_DEPLOY_KEY:-${ROOT}/secrets/github_deploy_key}"

export GIT_SSH_COMMAND="ssh -i ${DEPLOY_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

cd "${SRC}"
git remote set-url origin git@github.com:sahanxi/AIHub.git
git fetch origin
git checkout main
git reset --hard origin/main

SHA="$(git rev-parse --short HEAD)"
IMAGE_NAME="${IMAGE_NAME:-ai-platform-newapi}"
IMAGE="${IMAGE_NAME}:v1-${SHA}"

# Sync deploy templates and scripts from the repo checkout (preserve secrets/.env).
rsync -a --delete \
  --exclude '.env' \
  "${SRC}/deploy/" "${DEPLOY}/"
rsync -a --delete "${SRC}/scripts/" "${SCRIPTS}/"

if [[ -x "${SCRIPTS}/backup.sh" ]]; then
  "${SCRIPTS}/backup.sh"
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
grep -vE '^(IMAGE_NAME|IMAGE_TAG)=' .env > "${tmp_env}" || true
{
  cat "${tmp_env}"
  echo "IMAGE_NAME=${IMAGE_NAME}"
  echo "IMAGE_TAG=v1-${SHA}"
} > .env.new
mv .env.new .env
chmod 600 .env

if [[ -f "${ROOT}/secrets/.env" ]]; then
  grep -vE '^(IMAGE_NAME|IMAGE_TAG)=' "${ROOT}/secrets/.env" > "${tmp_env}" || true
  {
    cat "${tmp_env}"
    echo "IMAGE_NAME=${IMAGE_NAME}"
    echo "IMAGE_TAG=v1-${SHA}"
  } > "${ROOT}/secrets/.env"
  chmod 600 "${ROOT}/secrets/.env"
fi

docker compose --env-file .env up -d --force-recreate new-api
"${SCRIPTS}/healthcheck.sh"
echo "deployed ${IMAGE}"
