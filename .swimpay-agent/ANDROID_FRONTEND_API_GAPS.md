# Android Frontend API Gaps

generated_at: 2026-05-03T21:39:35+03:00

Sprint 7E wires Android merchant screens to live backend APIs where those APIs already exist. Remaining mock repositories are explicit, typed and documented here; they are not represented as live backend behavior.

## Wired In Sprint 7E

- `GET /v1/merchant/receiving-routes`
- `POST /v1/merchant/receiving-routes`
- `PATCH /v1/merchant/receiving-routes/:route_id`
- `GET /v1/reviews`
- `POST /v1/reviews/:id/confirm`
- `POST /v1/reviews/:id/reject` with explicit `scope=signal`
- `POST /v1/reviews/:id/reject` with explicit `scope=order`

These Android repositories use the existing local/dev bearer token contract:

```text
Authorization: Bearer test_<merchant_id>
```

This is local/dev only and must not be treated as production merchant authentication.

## Still Mock Only

- `GET /v1/android-merchant/dashboard-summary`
- `GET /v1/android-merchant/review-queue/:payment_id`
- `GET /v1/android-merchant/connected-site`
- `POST /v1/android-merchant/connected-site/test`
- `POST /v1/android-merchant/configuration-test`

The Android app keeps typed mock repositories for these areas until a backend/mobile API is added.

## Existing Local Android Boundaries

- Onboarding readiness.
- Notification Listener Access state.
- App notification permission state.
- Receiver health/status basics.
- Debug/backend health and outbox diagnostics.

## Safety Constraints

- Do not invent backend behavior silently.
- Mock data must remain synthetic and merchant-safe.
- Raw card, raw phone, raw notification text, package/cert metadata, HMAC and webhook internals must not appear in default merchant UI.
- Android does not confirm orders or auto-confirm payments.
- Android does not directly send developer webhooks.
- Signal rejection remains signal-scoped by default; order rejection is an explicit separate action.
