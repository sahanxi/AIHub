# Deployment

Host layout:

```
/opt/ai-platform/
  src/new-api/     # this git checkout, branch product/v1
  secrets/.env     # chmod 600; never inside the git tree
  deploy/          # compose, nginx template; .env is a symlink to secrets/.env
  data/            # mysql, redis, new-api
  logs/
  backups/
  scripts/
  docs/
```

## Access before domain

```bash
ssh -i AIGateway.pem -L 3000:127.0.0.1:3000 ubuntu@54.238.30.145
# then open http://127.0.0.1:3000
```

Do not log in or paste API keys over `http://54.238.30.145`.

## First boot (Tokyo host)

1. Install Docker Engine + Compose plugin (official Docker CE, not a random script from the internet).
2. Optional but recommended on t3.small (2 GB RAM): 2 GiB swap file.
3. Create `/opt/ai-platform/{data,logs,backups}` owned by `ubuntu`.
4. Place this repository at `/opt/ai-platform/src/new-api`.
5. Copy `deploy/` (compose + nginx) and `scripts/` to `/opt/ai-platform/`. Do not keep production `.env` inside `src/new-api`.
6. `bash /opt/ai-platform/scripts/generate-env.sh` (writes `/opt/ai-platform/secrets/.env`, chmod 600). Then set `IMAGE_TAG` if needed.
7. `docker build -t ai-platform-newapi:v1-<sha> /opt/ai-platform/src/new-api`
8. `cd /opt/ai-platform/deploy && docker compose --env-file .env up -d`
9. `bash /opt/ai-platform/scripts/healthcheck.sh`
10. Complete New API setup wizard over the SSH tunnel. Set `SystemName`, CNY (already default), keep registration closed until Turnstile.

Never run `docker compose down -v` or `docker system prune -a --volumes` on production.

## HTTPS later

Point the official domain at `54.238.30.145`, issue Let's Encrypt certs, enable `deploy/nginx/ai-platform.conf`, then set:

```
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_TRUSTED_URL=https://<domain>
CORS_ALLOW_ORIGINS=https://<domain>
```

Do not turn on HSTS until HTTPS is stable.
