# Payment (V1)

## Path

```
Wallet UI (Alipay)
  → POST /api/user/pay  (authenticated, server quotes amount)
  → Alipay Open Platform page/WAP pay (RSA2)
  → POST /api/payment/alipay/notify
  → RSA2 verify + app_id match
  → order exists + total_amount matches stored TopUp.Money (±0.01)
  → RechargeAlipay (FOR UPDATE, pending → success once)
  → user quota += Amount * QuotaPerUnit
```

EPay remains in the engine. If Alipay direct is not configured and EPay credentials are present, `/api/user/pay` still uses EPay.

## Native Alipay (server env, never git / frontend)

- `ALIPAY_APP_ID`
- `ALIPAY_PRIVATE_KEY_FILE` (应用私钥, PKCS8)
- `ALIPAY_PUBLIC_KEY_FILE` (支付宝公钥 from the console — not 应用公钥)
- `ALIPAY_GATEWAY` (default `https://openapi.alipay.com/gateway.do`)
- `ALIPAY_NOTIFY_URL` (default `{ServerAddress}/api/payment/alipay/notify`)

Host files:

- `/opt/ai-platform/secrets/alipay/app_private_key.pem` (mode 600)
- `/opt/ai-platform/secrets/alipay/alipay_public_key.pem` (mode 600)

`PENDING_CONFIGURATION` until `ALIPAY_PUBLIC_KEY_FILE` contains the 支付宝公钥 after the 应用公钥 is uploaded in 开放平台.

## Other admin fields

- `PayMethods` (default: Alipay only)
- `payment_setting.amount_options` (preset amounts, not hardcoded in React)
- `payment_setting.compliance_confirmed` (Root must confirm before top-up is enabled)
- `CustomCallbackAddress` / `ServerAddress` for return URL

## What V1 does not do

- Stripe / Creem / Waffo user UI (backend remains)
- WeChat pay UI (add `wxpay` in Admin PayMethods later)
- Client-side balance increment

## Callback tests (after credentials exist)

1. Create order → pay → notify → balance increases once
2. Replay notify → idempotent, no double credit
3. Bad signature → fail, no credit
4. Wrong money → fail, no credit
5. Unknown trade_no → fail, no credit
