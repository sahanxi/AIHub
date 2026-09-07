# Operations

## Daily

- `scripts/healthcheck.sh`
- `scripts/backup.sh` (keep ≥ 7 MySQL dumps)

## After reboot

Compose uses `restart: unless-stopped`. Confirm with `docker compose ps` and `/api/status`.

## Channels (PENDING_CONFIGURATION)

Create in Admin → Channels when keys exist:

| Name | Provider |
|---|---|
| OpenAI Official | OpenAI |
| Anthropic Official | Anthropic |
| Google Gemini Official | Gemini |

Tokyo can reach these providers directly. Do not install Clash/V2Ray/Xray.

## Groups

Create `standard` and `internal`. Assign customers to `standard`, staff to `internal`. Tune rate limits after real traffic; do not start with tiny production caps.

## Updates

`scripts/update.sh` — interactive, requires review. No Watchtower.

## Rollback

`scripts/rollback.sh` switches the previous image tag. It does **not** delete the database. SQL restore is `docs/RESTORE.md`.

## Time

OS may stay UTC. Application `TZ=Asia/Shanghai`.
