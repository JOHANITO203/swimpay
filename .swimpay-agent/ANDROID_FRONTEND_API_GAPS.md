# Android Frontend API Gaps

generated_at: 2026-05-03T22:55:00+03:00

Sprint 7F closes the Android merchant mobile backend gaps that were still mock-only in Sprint 7E. The app now has live authenticated endpoints for dashboard summary, payment detail, connected site status, connected site test and configuration test.

## Wired In Sprint 7E

- `GET /v1/merchant/receiving-routes`
- `POST /v1/merchant/receiving-routes`
- `PATCH /v1/merchant/receiving-routes/:route_id`
- `GET /v1/reviews`
- `POST /v1/reviews/:id/confirm`
- `POST /v1/reviews/:id/reject` with explicit `scope=signal`
- `POST /v1/reviews/:id/reject` with explicit `scope=order`

## Wired In Sprint 7F

- `GET /v1/android-merchant/dashboard-summary`
- `GET /v1/android-merchant/payments/:id`
- `GET /v1/android-merchant/connected-site`
- `POST /v1/android-merchant/connected-site/test`
- `POST /v1/android-merchant/configuration-test`

These Android repositories use the existing local/dev bearer token contract:

```text
Authorization: Bearer test_<merchant_id>
```

This is local/dev only and must not be treated as production merchant authentication.

## Remaining Backend Gaps

No Sprint 7F Android merchant screen remains mock-only for the current private-beta surface.

Future production hardening still needs a real merchant auth/session system, persisted merchant webhook endpoint administration, and production-grade connected-site delivery history. Those are product/backend hardening items, not Android mock gaps.

## Sprint 7F Validation Note

Code-level endpoint and Android repository tests passed, and the debug APK installed/launched on the authorized real device. Live Docker-backed endpoint QA is still blocked by a local Docker Desktop/containerd I/O failure. Do not treat that environment blocker as a remaining Android mock gap.

## Existing Local Android Boundaries

- Onboarding readiness.
- Notification Listener Access state.
- App notification permission state.
- Receiver health/status basics.
- Debug/backend health and outbox diagnostics.

## Safety Constraints

- Raw card, raw phone, raw notification text, package/cert metadata, HMAC and webhook internals must not appear in default merchant UI.
- Android does not confirm orders or auto-confirm payments.
- Android does not directly send developer webhooks.
- Signal rejection remains signal-scoped by default; order rejection is an explicit separate action.
- Connected-site test is requested through the backend and returns a safe queued/sent state only.
