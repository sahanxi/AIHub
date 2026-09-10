# Product customizations (`product/v1`)

This file is the audit trail for `git diff upstream/main...product/v1`.

Layer legend: **UI** / **Config** / **Extension** / **Core**

When merging upstream: re-read this file, prefer rebasing our UI on theirs, and do not take upstream default passwords, public ports, or `AllowAllOrigins + AllowCredentials`.

## Must (V1)

| Change | Layer | Files | Why | Upstream merge notes |
|---|---|---|---|---|
| Homepage 500: restore `cn` / `useSystemConfig` imports | UI | `system-brand.tsx`, `footer.tsx` | Branding commit dropped imports; SPA error boundary showed 500 after setup | Keep both fallback constants and the original utility imports |
| Default UI language zh-CN | UI | `web/src/i18n/config.ts` | Mainland users; English retained | If upstream changes detector, keep `zhCN` fallback |
| User IA sidebar | UI | `web/src/hooks/use-sidebar-data.ts`, `web/src/hooks/use-sidebar-config.ts` | Hide ops concepts from end users | Re-apply nav items after upstream sidebar refactors |
| Homepage product copy + API examples | UI | `web/src/features/home/**` | Independent product, not New API marketing | HomePageContent admin HTML still overrides |
| Dashboard: today + month spend, empty CTAs | UI | `web/src/features/dashboard/**` | First-screen wallet/usage clarity | Uses existing `/api/data/self`; no new billing API |
| API Key security copy | UI | `web/src/features/keys/index.tsx` | Keys are secrets | Additive only |
| Pricing: CNY / 1M tokens from backend | UI + Config | pricing features + `general_setting.quota_display_type` | No hardcoded prices | If `/api/pricing` shape changes, update formatters only |
| Wallet: Alipay-first, hide unconfigured gateways, balance disclaimer | UI | `web/src/features/wallet/**` | CNY + Alipay V1 | Keep Stripe/Creem code paths; gate on server flags |
| Native Alipay Open Platform | Extension | `controller/topup_alipay.go`, `service/alipay.go`, `setting/payment_alipay.go` | RSA2 page/WAP pay + notify | Keep EPay as unused fallback; do not put keys in git |
| Hide V1.1 ops modules in default user nav | UI | sidebar defaults | Playground/subscription/affiliate/coupon not V1 | Re-enable via `SidebarModulesAdmin` later |
| Registration closed until Turnstile | Config | `common/constants.go` `RegisterEnabled` | Stop open signup | Upstream may default true; keep false for this product |
| CNY display default | Config | `setting/operation_setting/general_setting.go` | Mainland market | Confirm admin can still switch USD |
| Alipay-only default PayMethods | Config | `setting/operation_setting/payment_setting_old.go` | WeChat reserved, not shown | Admin can add `wxpay` later |
| CORS: no `*` + credentials | Extension | `middleware/cors.go` | Browser credential isolation | Same-origin dashboard; SDK uses Authorization |
| Redact secret headers in relay clones | Extension | `relay/common/relay_info.go` | Authorization must not leak into expr/logs | Do not redact channel keys used for upstream calls |
| EPay callback amount check | Extension | `controller/topup.go` + tests | Defense in depth vs signed underpay | Keep `RechargeEpay` idempotency |
| Production compose / nginx / scripts | Config | `deploy/`, `scripts/` | Hardened runtime; Nginx for `aihub.xzsmart.top`; logo file is on the host data volume, not git | Do not copy official `docker-compose.yml` ports/passwords. Enable HTTP→HTTPS 301 only after SG allows :443 |
| Product docs | Config | `docs/*.md` | Operations + upgrade | Keep LICENSE/NOTICE |

## Should

| Item | Layer | Status |
|---|---|---|
| Groups `standard` / `internal` | Config | Documented; create in Admin after first boot. Do not rename engine `default` group in code. |
| Feature flags for WeChat / Stripe | Config | Server already gates on credentials + compliance |
| Nginx security headers | Config | Template ready; HSTS only after stable HTTPS |
| Log rotation | Config | json-file 10m × 5 |

## Later (not V1)

- Cost / latency / health router
- WeChat pay UI
- Stripe / Creem / Waffo user UI
- Subscription, invitation, coupon user surfaces
- DeepSeek / Qwen channels
- Public domain + Let's Encrypt
- S3 offsite backup, CloudWatch, IMDS hop-limit lock via IAM (report-only if no permission)
- Watchtower / auto-update

## Core files intentionally NOT rewritten

Billing, Token, Wallet credit math, Channel router, Group ratio engine, payment order persistence (`RechargeEpay` transaction).

## License

AGPL-3.0. Do not delete `LICENSE`, `NOTICE`, `THIRD-PARTY-LICENSES.md`, or footer project attribution. User-visible “New API” marketing copy may be replaced; legal attribution stays.
