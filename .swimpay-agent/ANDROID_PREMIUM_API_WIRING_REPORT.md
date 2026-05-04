# Android Premium API Wiring Report

generated_at: 2026-05-04T03:25:00+03:00

## Status

passed_android_unit_validation

## Summary

The premium Android merchant UI is no longer purely static/mock for the main merchant surface.

Added `PremiumMerchantRuntime` as the integration boundary between the premium Compose screens and the existing Sprint 7F Android merchant repositories.

No backend endpoints, event names, payment state machines, matching logic, webhook behavior or Android notification capture logic were changed.

## Review Follow-up

Updated after multi-agent review:

- `MainActivity` now creates the premium runtime through `PremiumMerchantRuntime.forAppBuild()`.
- Debug builds may use local/dev auth for local QA.
- Non-debug builds use `PremiumMerchantRuntime.disconnected()` instead of creating a `Bearer test_*` dev session.
- `/v1/reviews` remains the intentional existing authenticated review API contract for queue/actions until a future Android-specific facade is added.
- `MerchantReviewActionsApiRepository.backendOwnsReviewDecisions=true` documents that merchant actions are backend requests, not Android-side payment decisions.

## Wired Contracts

The premium runtime now consumes:

- `GET /v1/android-merchant/dashboard-summary`
- `GET /v1/reviews`
- `GET /v1/android-merchant/payments/:id`
- `POST /v1/reviews/:id/confirm`
- `POST /v1/reviews/:id/reject`
- `GET /v1/android-merchant/connected-site`
- `POST /v1/android-merchant/configuration-test`

Review rejection still uses explicit scope:

- `signal` for signal rejection;
- `order` only for explicit order rejection.

Android still does not send developer webhooks directly.

## UI Behavior

Premium screens keep the visual shell and now receive contract-backed state:

- dashboard metrics and recent payments;
- review queue rows;
- payment detail rows and review actions;
- connected-site summary;
- configuration test summary.

The UI falls back to preview/dev data if the local backend is unreachable.

## Safety

The added tests verify:

- premium runtime calls the live Sprint 7F endpoint paths;
- visible UI state excludes raw card, raw phone, webhook secrets and internal backend reason codes;
- `official_bank_confirmation` is not exposed in merchant UI;
- confirm/reject actions remain backend-owned;
- signal rejection does not reject the order by default.

## Remaining Gaps

- Auth is still local/dev: `Bearer test_<merchant_id>`.
- Production merchant auth/session handoff remains a separate sprint.
- Connected-site delivery history is still private-beta foundation, not a production delivery center.
- Some visual sections still have dev fallback data for offline/local resilience.

## Validation

Passed:

- Android `:app:compileDebugKotlin`
- Android `:app:testDebugUnitTest`
