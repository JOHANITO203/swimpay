# Checkout Return To Merchant Report

generated_at: 2026-05-13T00:35:00+03:00

## Root Cause

The confirmed buyer checkout rendered `Retourner au marchand` as `history.back()`. That is unreliable for external Android apps opened through Custom Tabs or browser intents.

The Android SDK also accepted `returnScheme`, but only forwarded `bankLauncherScheme` to the hosted checkout URL. Therefore the hosted checkout had no app return target to render.

## Fix

- `SwimPayCheckout.open(...)` now appends `swimpay_return_scheme` when `SwimPayCheckoutOptions.returnScheme` is configured.
- Hosted checkout validates `swimpay_return_scheme` as a custom app scheme.
- Unsafe schemes are rejected:
  - `http`;
  - `https`;
  - `javascript`;
  - `data`;
  - `file`;
  - `content`;
  - `intent`;
  - `android-app`.
- Hosted checkout synthesizes a return URL:
  - `merchantapp://swimpay-return?status=completed&payment_session_id=...&order_id=...`
- Confirmed checkout button uses the return URL instead of `history.back()`.
- If no valid return URL exists, the previous browser history fallback remains.

## Product Boundary

- The app return does not confirm payment.
- Android still only refreshes merchant backend state after return.
- No webhook semantic change.
- No auto-confirmation.
- No real bank notification processing.
- `official_bank_confirmation=false` remains true for SwimPay public semantics.

## Tests

Targeted command:

```bash
npm test -- apps/web/src/checkout.test.ts tests/sdk-android-product-truth.test.ts
```

Result:

- 2 files passed.
- 47 tests passed.

## Staging Test

Open checkout from the Android app with:

```kotlin
SwimPayCheckoutOptions(
  returnScheme = "merchantapp",
  bankLauncherScheme = "merchantapp"
)
```

After merchant confirmation, tap `Retourner au marchand`.

Expected:

- Android receives `merchantapp://swimpay-return?...`.
- App calls `SwimPayCheckout.parseReturnIntent(...)`.
- App refreshes order status from merchant backend.
- No local confirmation is performed.
