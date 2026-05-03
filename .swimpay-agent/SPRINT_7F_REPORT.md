# Sprint 7F Report - Android Mobile Backend Gap Closure

status: blocked_by_docker_environment
generated_at: 2026-05-03T23:20:11+03:00

## Summary

Sprint 7F added the remaining Android merchant mobile backend endpoints and wired the Android merchant repositories away from Sprint 7E mock-only gaps.

The code, Node test suite, Android build, Android JVM tests and real-device APK install/launch passed. Full live Docker-backed backend validation is blocked by a local Docker Desktop/containerd I/O failure. No code-level validation failure was found.

This sprint did not process real bank notifications, did not add SMS or Accessibility behavior, did not enumerate installed apps, did not expose raw card/phone or raw notification text, did not expose package/cert/HMAC/template internals, did not claim official bank confirmation and did not enable auto-confirmation.

## Tasks

- `404_android_dashboard_summary_endpoint` - completed
- `405_android_payment_detail_endpoint` - completed
- `406_android_connected_site_status_endpoint` - completed
- `407_android_connected_site_test_endpoint` - completed
- `408_android_configuration_test_endpoint` - completed
- `409_android_frontend_gap_wiring_cleanup` - completed
- `410_android_real_device_full_flow_visual_qa` - blocked by local Docker backend health
- `411_sprint_7f_closeout_review` - completed

## Dashboard Endpoint

Added `GET /v1/android-merchant/dashboard-summary`.

Behavior:

- requires authenticated merchant context with the existing local/dev bearer contract;
- returns merchant-safe counts, receiver status and recent detected payments;
- excludes raw card, raw phone, raw notification text and internal package/cert/HMAC/template data;
- includes the public notification-signal disclosure with `official_bank_confirmation=false`.

## Payment Detail Endpoint

Added `GET /v1/android-merchant/payments/:id`.

Behavior:

- requires authenticated merchant context;
- returns expected/detected amount, bank display name, masked receiving method, payment reference, signal received time, reason labels and allowed actions;
- returns `confirm`, `reject_signal` and `reject_order` as separate actions;
- does not expose raw notification text, raw receiver identifier or raw buyer phone.

## Connected Site Endpoint

Added `GET /v1/android-merchant/connected-site`.

Behavior:

- requires authenticated merchant context;
- returns a merchant-safe connected-site status, masked/safe URL display, last delivery status and latest delivery labels;
- hides developer event names by default;
- exposes limited developer details only when explicit developer mode is requested;
- never returns webhook secrets.

## Connected Site Test Endpoint

Added `POST /v1/android-merchant/connected-site/test`.

Behavior:

- requires authenticated merchant context;
- publishes/enqueues a safe test-only webhook delivery request through the backend event publisher;
- returns `test_queued` with a delivery id and safe status;
- Android does not send the webhook directly;
- payload disclosure remains `confirmation_type=notification_signal` and `official_bank_confirmation=false`.

## Configuration Test Endpoint

Added `POST /v1/android-merchant/configuration-test`.

Behavior:

- requires authenticated merchant context;
- runs non-confirming readiness checks for phone connection, bank selection, receiving method and connected site;
- returns the approved merchant-facing checklist labels;
- does not confirm a real payment and does not emit `payment.confirmed`.

## Android Wiring Cleanup

Android now has API repositories for:

- dashboard summary;
- payment detail by id;
- connected site status;
- connected site test action;
- configuration test action.

The Sprint 7E mock-only gaps were removed from the Android frontend contract list for the current private-beta surface. Mock fallback remains only for local/dev/offline resilience and is documented as such.

## Real-device QA

Authorized device:

- `R5CWA0FEPZW` / Samsung SM-S916B

Passed:

- `adb devices -l` found the authorized device.
- `adb reverse tcp:8080 tcp:8080` succeeded.
- Debug APK install succeeded.
- `MainActivity` launch succeeded.
- UI-tree dumps after scroll showed onboarding, Notification Access gate, bank selection, configuration sections, dashboard/recent payments, review queue, connected site and action-required states.
- UI-tree scans found no forbidden merchant-facing jargon and no obvious raw card/phone/customer values.

Blocked:

- Docker-backed live endpoint QA could not be completed because Docker Desktop/containerd returned I/O errors and Compose health degraded.

## Tests

Added/updated:

- `apps/api/src/android-merchant.test.ts`
- `AndroidMerchantApiWiringTest.kt`

Coverage includes:

- dashboard endpoint response safety;
- payment detail endpoint response safety;
- connected-site default/developer-mode boundary;
- backend-owned connected-site test action;
- non-confirming configuration test;
- Android repositories calling the Sprint 7F endpoints;
- Android UI models excluding secrets/raw PII;
- closed gap contracts downgraded from mock-only to live.

## Validation

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` - 53 files / 366 tests
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- Android `:app:assembleDebug`
- Android `:app:testDebugUnitTest`
- `adb devices -l`
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080`
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity`
- `adb -s R5CWA0FEPZW shell uiautomator dump`

Failed or blocked by local Docker:

- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --build swimpay-api proxy` failed with Docker BuildKit/containerd I/O errors.
- `docker compose --env-file .env.example -f infra/docker-compose.yml restart ...` failed with Docker container filesystem I/O errors.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` timed out after the Docker I/O failure.
- `GET http://localhost:8080/api-health` timed out after the Docker I/O failure; before the timeout state it returned `database=error` and `valkey=error`.

## Blockers

Critical local environment blocker:

- Docker Desktop/containerd has I/O errors in its local image/container storage. This blocks Compose health, backend live-device endpoint QA and the final commit condition for Sprint 7F.

## Next Recommended Sprint

First action:

1. Repair or fully restart Docker Desktop/WSL and rerun Sprint 7F backend validation plus live-device endpoint QA.

Then:

2. Sprint 7G - Android merchant beta hardening: production auth handoff, better connected-site delivery history, and navigation polish.
