# Android Frontend API Gaps

generated_at: 2026-05-03T20:20:00+03:00

Sprint 7D implements typed Android merchant frontend contracts and mock repositories for screens whose backend/mobile API is not yet connected.

## Existing Local Android Boundaries

- Onboarding readiness.
- Notification Listener Access state.
- App notification permission state.
- Receiver health/status basics.
- Debug/backend health and outbox diagnostics.

## Backend/API Gaps For Future Wiring

- `GET /v1/android-merchant/dashboard-summary`
- `GET /v1/android-merchant/review-queue`
- `GET /v1/android-merchant/review-queue/:payment_id`
- `POST /v1/android-merchant/review-queue/:payment_id/confirm`
- `POST /v1/android-merchant/review-queue/:payment_id/reject-signal`
- `POST /v1/android-merchant/review-queue/:payment_id/reject-order`
- `GET /v1/android-merchant/connected-site`
- `POST /v1/android-merchant/connected-site/test`

## Safety Constraints

- Do not invent backend behavior silently.
- Mock data must remain synthetic and merchant-safe.
- Raw card, raw phone, raw notification text, package/cert metadata, HMAC and webhook internals must not appear in default merchant UI.
- Android still does not confirm orders or auto-confirm payments.
