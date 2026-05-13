# Staging Return Target Setup Report

Date: 2026-05-13

## Current observed behavior

- Buyer reaches confirmed checkout.
- Final CTA resolves to `/merchant/return-unavailable?...`.
- This indicates missing/invalid return target for this checkout context.

## Android-first return contract (V1)

Priority after confirmation:

1. `swimpay_return_scheme` or `android_return_scheme` query param (native return).
2. Stored safe `orders.return_url` (web fallback).
3. Safe fallback page (`/merchant/return-unavailable`).

## SDK requirement for Android host app

Use:

```kotlin
SwimPayCheckoutOptions(
  returnScheme = "swimvpn",
  bankLauncherScheme = "swimvpn"
)
```

Hosted checkout then receives `?swimpay_return_scheme=swimvpn` and returns to:

`swimvpn://swimpay-return?status=completed&payment_session_id=...&order_id=...&external_id=...`

## Web fallback requirement

When creating order via API, ensure safe UX URL in `return_url` (or `web_return_url` alias), not raw API JSON endpoint.

