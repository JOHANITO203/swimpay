# Android contact support report

generated_at: 2026-05-09T00:08:00+03:00

Implemented Android Contact Support as a real backend-backed form.

## Android

- Added `PremiumContactSupportScreen`.
- Added categories: receiver issue, payment review issue, integration/webhook issue, account/security issue and other.
- Added validation and submitted/error state.
- Collected only safe context from runtime: app version, Android version, notification access state.

## Backend

- Added `POST /v1/android-merchant/support-tickets`.
- Requires Android mobile session.
- Derives `merchant_id` and `user_id` server-side.
- Rejects client-controlled `merchant_id`, raw phone/card-like values, API keys, webhook secrets, SMS codes, PIN/CVV and raw notification fields.
- Persists tickets through `android_merchant_support_tickets`.

## Database

- Added additive migration `012_android_merchant_support_tickets.sql`.

## Tests

- Added `apps/api/src/android-merchant-support.test.ts` coverage for auth, raw-data rejection, durable create and manual-only settings.
