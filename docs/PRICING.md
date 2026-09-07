# Pricing (V1)

User-facing prices come from New API `/api/pricing` (ratios / model price table), formatted as **¥ / 1M tokens** when `general_setting.quota_display_type=CNY`.

Do not hardcode GPT/Claude/Gemini RMB rates in React.

## Display

- Currency: CNY (`¥`)
- Engine unit `QuotaPerUnit` is hidden from end users
- Unconfigured prices render as `—` / 未配置
- Admin may still inspect USD-equivalent and raw ratios

## Operating formula (not encoded as a production multiplier)

```
user price = upstream cost + platform margin
```

Margin is **not** set in V1 code. Do not ship 1.2 / 1.5 / 2.0 as official production ratios until the operator chooses them in Admin → Models / Billing.

## Model mapping

Public model name → Channel Model Mapping → provider model. No V1 custom router.

## Groups

Plan `standard` (default customers) and `internal` (staff) in Admin Groups. Engine default group name remains `default` until you create aliases. Do not rewrite GroupRatio internals.
