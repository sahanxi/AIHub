#!/usr/bin/env bash
set -Eeuo pipefail

readonly DEFAULT_DEPLOY_DIR="/opt/ai-platform/deploy"
readonly DEPLOY_DIR="${DEPLOY_DIR:-$DEFAULT_DEPLOY_DIR}"
readonly ENV_FILE="${DEPLOY_ENV_FILE:-$DEPLOY_DIR/.env}"
readonly COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-$DEPLOY_DIR/docker-compose.yml}"
readonly IMAGE_REF="${1:-}"

if [[ $EUID -ne 0 ]]; then
  echo "error: run this script as root" >&2
  exit 1
fi

if [[ ! $IMAGE_REF =~ ^ghcr\.io/sahanxi/ai-platform-newapi:sha-([0-9a-f]{40})$ ]]; then
  echo "error: expected ghcr.io/sahanxi/ai-platform-newapi:sha-<40-character-git-sha>" >&2
  exit 1
fi

readonly EXPECTED_SHA="${BASH_REMATCH[1]}"
readonly IMAGE_NAME="${IMAGE_REF%:*}"
readonly IMAGE_TAG="${IMAGE_REF##*:}"

for command_name in docker flock awk install mktemp; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "error: required command not found: $command_name" >&2
    exit 1
  fi
done

if [[ ! -f $ENV_FILE || ! -f $COMPOSE_FILE ]]; then
  echo "error: missing $ENV_FILE or $COMPOSE_FILE" >&2
  exit 1
fi

exec 9>"$DEPLOY_DIR/.update-image.lock"
if ! flock -n 9; then
  echo "error: another deployment is already running" >&2
  exit 1
fi

current_name=$(awk -F= '$1 == "IMAGE_NAME" {print substr($0, index($0, "=") + 1); exit}' "$ENV_FILE")
current_tag=$(awk -F= '$1 == "IMAGE_TAG" {print substr($0, index($0, "=") + 1); exit}' "$ENV_FILE")
if [[ -z $current_name || -z $current_tag ]]; then
  echo "error: IMAGE_NAME and IMAGE_TAG must already exist in $ENV_FILE for safe rollback" >&2
  exit 1
fi
readonly PREVIOUS_IMAGE="${current_name}:${current_tag}"

if ! docker image inspect "$PREVIOUS_IMAGE" >/dev/null 2>&1; then
  echo "error: previous image is not present locally for rollback: $PREVIOUS_IMAGE" >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet

echo "Pulling $IMAGE_REF"
docker pull "$IMAGE_REF"

built_sha=$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$IMAGE_REF")
if [[ $built_sha != "$EXPECTED_SHA" ]]; then
  echo "error: image revision label '$built_sha' does not match tag SHA '$EXPECTED_SHA'" >&2
  exit 1
fi

image_digest=$(docker image inspect --format '{{ index .RepoDigests 0 }}' "$IMAGE_REF")
rollback_env=$(mktemp "$DEPLOY_DIR/.env.rollback.XXXXXX")
next_env=$(mktemp "$DEPLOY_DIR/.env.next.XXXXXX")
chmod 600 "$rollback_env" "$next_env"
cp --preserve=mode,ownership,timestamps "$ENV_FILE" "$rollback_env"

cleanup() {
  rm -f "$rollback_env" "$next_env"
}
trap cleanup EXIT

awk -v image_name="$IMAGE_NAME" -v image_tag="$IMAGE_TAG" '
  BEGIN { found_name = 0; found_tag = 0 }
  /^IMAGE_NAME=/ { print "IMAGE_NAME=" image_name; found_name = 1; next }
  /^IMAGE_TAG=/ { print "IMAGE_TAG=" image_tag; found_tag = 1; next }
  { print }
  END {
    if (!found_name) print "IMAGE_NAME=" image_name
    if (!found_tag) print "IMAGE_TAG=" image_tag
  }
' "$ENV_FILE" > "$next_env"

install -o root -g root -m 600 "$next_env" "$ENV_FILE"

if ! docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet; then
  install -o root -g root -m 600 "$rollback_env" "$ENV_FILE"
  echo "error: generated Compose configuration is invalid" >&2
  exit 1
fi

rollback() {
  echo "Deployment failed; rolling back to $PREVIOUS_IMAGE" >&2
  install -o root -g root -m 600 "$rollback_env" "$ENV_FILE"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps --force-recreate new-api
}

if ! docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps --force-recreate new-api; then
  rollback
  exit 1
fi

healthy=false
for _ in {1..36}; do
  container_id=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q new-api)
  if [[ -n $container_id ]]; then
    status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")
    if [[ $status == healthy ]]; then
      healthy=true
      break
    fi
    if [[ $status == exited || $status == dead ]]; then
      break
    fi
  fi
  sleep 5
done

if [[ $healthy != true ]]; then
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail 100 new-api >&2 || true
  rollback
  exit 1
fi

printf '%s\n' "$image_digest" > "$DEPLOY_DIR/deployed-image.txt"
chmod 600 "$DEPLOY_DIR/deployed-image.txt"

echo "Deployment succeeded"
echo "Image: $IMAGE_REF"
echo "Digest: $image_digest"
echo "Previous image retained for rollback: $PREVIOUS_IMAGE"
