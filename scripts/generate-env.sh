#!/usr/bin/env bash
set -euo pipefail

# Generate deploy/.env once. Does not overwrite an existing file.

ROOT="${AI_PLATFORM_ROOT:-/opt/ai-platform}"
DEPLOY="${ROOT}/deploy"
SECRETS="${ROOT}/secrets"
ENV_FILE="${SECRETS}/.env"
EXAMPLE="${DEPLOY}/.env.example"

mkdir -p "${SECRETS}" "${DEPLOY}"

if [[ -f "${ENV_FILE}" ]] || [[ -f "${DEPLOY}/.env" && ! -L "${DEPLOY}/.env" ]]; then
  echo "an env file already exists under ${SECRETS} or ${DEPLOY}; refusing to overwrite" >&2
  exit 1
fi

rand() { openssl rand -hex 48; }

MYSQL_ROOT_PASSWORD="$(rand)"
MYSQL_PASSWORD="$(rand)"
REDIS_PASSWORD="$(rand)"
SESSION_SECRET="$(rand)"
CRYPTO_SECRET="$(rand)"
SHA="${IMAGE_TAG:-local}"

umask 077
cat > "${ENV_FILE}" <<EOF
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD}"
MYSQL_DATABASE="newapi"
MYSQL_USER="newapi"
MYSQL_PASSWORD="${MYSQL_PASSWORD}"

REDIS_PASSWORD="${REDIS_PASSWORD}"

SESSION_SECRET="${SESSION_SECRET}"
CRYPTO_SECRET="${CRYPTO_SECRET}"

TZ="Asia/Shanghai"
SQL_DSN="newapi:${MYSQL_PASSWORD}@tcp(mysql:3306)/newapi?charset=utf8mb4&parseTime=true&loc=Asia%2FShanghai"
REDIS_CONN_STRING="redis://:${REDIS_PASSWORD}@redis:6379/0"

IMAGE_NAME="ai-platform-newapi"
IMAGE_TAG="${SHA}"

DATA_ROOT="/opt/ai-platform/data"
LOG_ROOT="/opt/ai-platform/logs"

CORS_ALLOW_ORIGINS=""
SESSION_COOKIE_SECURE="false"
SESSION_COOKIE_TRUSTED_URL=""
TRUSTED_PROXIES="127.0.0.1,172.16.0.0/12"
EOF

chmod 600 "${ENV_FILE}"
ln -sfn "${ENV_FILE}" "${DEPLOY}/.env"
echo "wrote ${ENV_FILE} (chmod 600) and linked ${DEPLOY}/.env. Values are not printed."
echo "example template remains at ${EXAMPLE}"
