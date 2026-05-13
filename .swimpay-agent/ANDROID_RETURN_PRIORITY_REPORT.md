# Android Return Priority Report

## Result

Android SDK native return now wins over the stored merchant web return URL.

Priority after a final hosted checkout state:

1. `android_return_scheme` or `swimpay_return_scheme`
2. stored `web_return_url` / `return_url`
3. safe fallback UI

## Root Cause

The hosted checkout built a native return URL only when `session.return_url` was absent. In Android SDK flows where the external backend also supplied a web/API return URL, the checkout used that URL first. This sent the buyer browser to the merchant API JSON response instead of back into the Android app.

## Contract

The hosted checkout now accepts both:

- `swimpay_return_scheme`
- `android_return_scheme`

When present and valid, it renders:

```text
{scheme}://swimpay-return?status=completed&payment_session_id=...&order_id=...&external_id=...
```

The return is UX only. It is not payment proof and does not fulfill the order.

## Files Changed

- `apps/web/src/index.ts`
- `apps/web/src/checkout.test.ts`
- `apps/api/src/payment-sessions.ts`
- `apps/api/src/payment-sessions.test.ts`
- `packages/swimpay-android/README.md`
- `docs/SDK_ANDROID_QUICKSTART.md`
- `docs/SDK_DEVELOPER_INTEGRATION_GUIDE.md`
- `examples/android-merchant-basic/README.md`
- `tests/sdk-android-product-truth.test.ts`

