# Security notes (V1)

## Defaults

- `RegisterEnabled=false` until Cloudflare Turnstile is configured.
- `QuotaForNewUser=0`
- `TLS_INSECURE_SKIP_VERIFY` must stay unset/false.
- Session/crypto secrets are 48-byte hex, unique, stored in `deploy/.env` mode 600.
- CORS: wildcard origins never combine with credentials. Set `CORS_ALLOW_ORIGINS` to the HTTPS site origin after the domain exists.

## Logging

Gin access logs do not print headers. Relay request-header clones redact `Authorization`, `x-api-key`, `api-key`, `Cookie`, and `x-goog-api-key` to `sk-ab...xyz` form.

Do not enable debug access dumps that print Bearer tokens.

## Network

- SSH (22): audit only. Do not change sshd, ports, or authorized_keys from this project.
- App: `127.0.0.1:3000` only.
- MySQL / Redis: Docker `backend` network, no host ports.
- AWS SG target: 22 (admin IP), 80/443 public. Confirm in Console; do not edit SG from this host without an explicit request.

## Payment

Wallet credit happens only after EPay signature verify + order lookup + amount match + `RechargeEpay` row lock. The browser never increments balance.

## SSH findings (audit, not changed)

- Password authentication: off
- Public key: on
- Root login: without-password (key)
- UFW: inactive (rely on AWS SG)
- SG name indicated 22 and 80 open to `0.0.0.0/0` — **risk**: SSH should be restricted to a trusted admin IP when possible

## IMDS / EBS

- IMDSv2 token worked; IMDSv1 returned 401 (IMDSv2 required). Do not loosen.
- EBS encryption: AWS CLI not installed; confirm in AWS Console. Do not rebuild the volume.
- CloudWatch agent: not installed. Future: EC2 instance role, no long-lived access keys on disk.
