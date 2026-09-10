# AI API Platform V1 Architecture

Product branch: `product/v1`  
Upstream: `QuantumNous/new-api` (`upstream/main`)  
Engine: New API  
Product: configurable brand (fallback name: **AIHub**; runtime `SystemName`)

This document describes the V1 commercial platform built **on** New API. New API is the engine, not the product brand.

## 1. V1 architecture

```
                    User (CN mainland)
                           │
                    HTTPS / 443  (`https://aihub.xzsmart.top`)
                           │
                           ▼
                    Nginx (edge template)
                           │
                           ▼
              ┌──────────────────────────┐
              │ Productized UI + New API │  127.0.0.1:3000
              └────────────┬─────────────┘
                           │
                 ┌─────────┴─────────┐
                 ▼                   ▼
               MySQL 8.x           Redis 7.x
               (utf8mb4)           (private net)
                           │
                           ▼
                    New API Gateway
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
            GPT         Claude        Gemini
```

V1 is a single-host Docker Compose stack on AWS Tokyo (`ap-northeast-1`). No Kubernetes, Swarm, or extra observability stack.

Business timezone for application display: `Asia/Shanghai` (`TZ`). OS clock may remain UTC.

## 2. Upstream boundary

Treat New API core as an **engine**:

| Owned by upstream | Must not rewrite in V1 |
|---|---|
| User / session / password | Billing ratios |
| API Token (Key) | Quota wallet math |
| Channel + model mapping | Payment order table |
| Router / failover / weight | Usage logging |
| Group | Pre-consume / settle |

Upgrade path:

```
git fetch upstream
git merge upstream/main   # into product/v1
review docs/CUSTOMIZATIONS.md
test → build image tagged with git SHA → deploy
```

Do not track `calciumion/new-api:latest` in production.

## 3. Product customization layer

Priority when changing behavior:

1. New API native options (`SystemName`, `Logo`, `Footer`, `PayMethods`, `general_setting.*`, `SidebarModulesAdmin`)
2. Existing extension points
3. Frontend UI
4. Config / deploy encapsulation (`deploy/`, `scripts/`)
5. Minimal backend extension (security defaults, callback amount check, CORS)
6. Core logic — last resort only

Frontend branding fallback constants live in `web/src/lib/product.ts`. Runtime name/logo still come from New API `SystemName` / `Logo`.

## 4. Authentication boundary

- Single account system: New API users. **No second user table.**
- Roles: User (1) / Admin (10) / Root (100). Route guards exist in both frontend and backend (`UserAuth` / `AdminAuth` / `RootAuth` + Casbin).
- Hiding a nav item is not authorization. Admin APIs remain `AdminAuth`/`RootAuth`.
- Production registration: **closed** until Cloudflare Turnstile is configured (`RegisterEnabled=false` by default).
- New-user gift quota: **0**.

## 5. Billing boundary

Keep native:

- `ModelRatio` / `CompletionRatio` / `GroupRatio`
- Pre-consume / settle / delta adjust
- Token remain quota

User-facing money is a **display** of quota using:

- `general_setting.quota_display_type = CNY`
- `USDExchangeRate` (default 7.3, admin-editable)
- `QuotaPerUnit` (engine unit; never shown to end users)

Do not hardcode model prices in React. Pricing UI reads `/api/pricing`.

V1 does **not** implement cost/latency routers. Use native Priority / Weight / Auto Disable / Model Mapping / Group / Failover.

Public model name → Model Mapping → provider model. Mapping is admin-configured in Channels.

## 6. Payment boundary

V1 path:

```
User wallet UI
    → POST /api/user/pay
    → Alipay Open Platform (RSA2 page/WAP pay)
    → POST /api/payment/alipay/notify
    → RechargeAlipay (row lock, pending→success once)
    → wallet quota
```

Rules:

- Browser never credits the wallet.
- Alipay private key and 支付宝公钥 stay in server secrets / env — never frontend or git.
- Stripe / Creem / Waffo remain in backend; user UI only shows methods the server actually enables.
- WeChat pay: code kept; default `PayMethods` is Alipay-only until admin enables it.
- EPay remains as a fallback path when Alipay direct is not configured.

`PENDING_CONFIGURATION`: 支付宝公钥 (after uploading 应用公钥 in 开放平台).

## 7. Database

Production: MySQL 8.x LTS, charset `utf8mb4`.

- Database: `newapi`
- App user: `newapi` (not root)
- DSN shape (New API current): `user:password@tcp(mysql:3306)/newapi?charset=utf8mb4&parseTime=true&loc=Asia%2FShanghai`
- Data dir: `/opt/ai-platform/data/mysql` (bind mount, not anonymous volume)
- Port **not** published to the host or internet

## 8. Redis

Redis 7.x, password required, Docker `backend` network only.

- `REDIS_CONN_STRING=redis://:PASSWORD@redis:6379/0`
- Port **not** published
- Used for rate limit + cache (`MEMORY_CACHE_ENABLED=true`)

## 9. Reverse proxy

Nginx production template: `deploy/nginx/ai-platform.conf`.

Until a domain exists:

- New API binds `127.0.0.1:3000`
- Operator access: `ssh -L 3000:127.0.0.1:3000 ubuntu@<host>` then `http://127.0.0.1:3000`
- Do not publish `:3000` on `0.0.0.0`
- Do not run public HTTP login on the raw Elastic IP

HTTPS / Let's Encrypt / `SESSION_COOKIE_SECURE` wait for the official domain.

## 10. Secrets

Generated per environment with `openssl rand -hex 48`, never reused:

| Secret | Where |
|---|---|
| `MYSQL_ROOT_PASSWORD` | `deploy/.env` chmod 600 |
| `MYSQL_PASSWORD` | same |
| `REDIS_PASSWORD` | same |
| `SESSION_SECRET` | same (fatal if `random_string`) |
| `CRYPTO_SECRET` | same |
| Upstream provider keys | Admin → Channels only |
| Alipay app private key / 支付宝公钥 | `/opt/ai-platform/secrets/alipay/` chmod 600 |

Git must not contain `.env`, `*.pem`, or live credentials. `deploy/.env.example` is names-only.

`TLS_INSECURE_SKIP_VERIFY` must stay unset/false.

## 11. Backup

- Script: `scripts/backup.sh`
- MySQL dump: `/opt/ai-platform/backups/mysql/newapi-YYYYMMDD-HHMMSS.sql.gz`
- Retain ≥ 7 daily dumps
- Config (non-secret): compose + nginx templates
- Secret copies are **not** mixed into world-readable backup dirs
- Restore: `docs/RESTORE.md`
- Offsite: **Recommended** S3 encrypted backup or EBS snapshot (not created in V1; no IAM/S3 was provided)

## 12. Update strategy

No Watchtower. No unattended engine updates.

`scripts/update.sh`: fetch upstream → review → DB backup → merge into `product/v1` → test → build `ai-platform-newapi:v1-<sha>` → deploy → healthcheck.

`scripts/rollback.sh` switches image tag + compose; it must **not** drop volumes.

Image tag always matches git short SHA for audit/rollback.
