# Payment (V1)

## Path

```
Wallet UI (Alipay)
  → POST /api/user/pay  (authenticated, server quotes amount)
  → EPay-compatible gateway
  → Alipay page
  → GET/POST /api/user/epay/notify
  → signature verify
  → order exists + money matches stored TopUp.Money (±0.01)
  → RechargeEpay (FOR UPDATE, pending → success once)
  → user quota += Amount * QuotaPerUnit
```

## Native fields (admin)

- `PayAddress` (EPay API URL)
- `EpayId` (PID)
- `EpayKey` (KEY)
- `PayMethods` (default: Alipay only)
- `payment_setting.amount_options` (preset amounts, not hardcoded in React)
- `CustomCallbackAddress` / `ServerAddress` for notify URL

`PENDING_CONFIGURATION`: EPay URL, PID, KEY. Do not invent production credentials.

## What V1 does not do

- Direct Alipay Open Platform SDK
- Stripe / Creem / Waffo user UI (backend remains)
- WeChat pay UI (add `wxpay` in Admin PayMethods later)
- Client-side balance increment

## Callback tests (after credentials exist)

1. Create order → pay → notify → balance increases once
2. Replay notify → idempotent, no double credit
3. Bad signature → fail, no credit
4. Wrong money → fail, no credit
5. Unknown trade_no → fail, no credit
