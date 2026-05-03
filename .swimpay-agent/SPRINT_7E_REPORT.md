# Sprint 7E Report - Android Merchant API Wiring and Visual QA

status: passed
generated_at: 2026-05-03T21:39:35+03:00

## Summary

Sprint 7E wired Android merchant frontend contracts to authenticated backend APIs where those APIs already exist and kept mock fallbacks explicit where backend endpoints are still missing.

This sprint did not process real bank notifications, did not add SMS or Accessibility behavior, did not enumerate installed apps, did not expose raw card/phone or raw notification text, did not claim official bank confirmation and did not enable auto-confirmation.

## Tasks

- `394_android_merchant_auth_session_contract` - completed
- `395_android_receiving_methods_api_wiring` - completed
- `396_android_dashboard_api_wiring` - completed
- `397_android_review_queue_api_wiring` - completed
- `398_android_review_actions_confirm_reject_wiring` - completed
- `399_android_connected_site_api_wiring` - completed
- `400_android_configuration_test_api_wiring` - completed
- `401_android_real_device_visual_qa` - completed
- `402_android_api_gap_cleanup_and_docs` - completed
- `403_sprint_7e_closeout_review` - completed

## Auth And Session

Added `AuthenticatedMerchantSession`.

- Missing auth produces a safe action-required state.
- Local/dev auth is explicitly labeled local/dev and uses the existing `Bearer test_<merchant_id>` contract.
- Bearer tokens, API keys and webhook secrets are excluded from visible merchant UI state.

## Receiving Methods API Wiring

Android now has an API repository for:

- `GET /v1/merchant/receiving-routes`
- `POST /v1/merchant/receiving-routes`
- `PATCH /v1/merchant/receiving-routes/:route_id`

Saved route display remains masked only. Raw card/phone input is used only in the create request body and is cleared from frontend submission state after save.

## Dashboard API Wiring

Dashboard remains an explicit mock repository because there is no dedicated Android dashboard summary endpoint yet.

Missing endpoint:

- `GET /v1/android-merchant/dashboard-summary`

## Review Queue API Wiring

Android now loads open reviews from:

- `GET /v1/reviews`

Backend reason codes are translated to simple merchant labels. Raw reason codes are not shown in merchant UI.

## Review Actions Wiring

Android now has review action repositories for:

- `POST /v1/reviews/:id/confirm`
- `POST /v1/reviews/:id/reject`

`Rejeter le signal` sends `scope=signal` and does not reject the order by default. `Rejeter la commande` sends `scope=order` as a separate explicit action. Android does not directly send developer webhooks.

## Connected Site API Wiring

Connected-site status remains an explicit mock repository because dedicated mobile endpoints are missing.

Missing endpoints:

- `GET /v1/android-merchant/connected-site`
- `POST /v1/android-merchant/connected-site/test`

Developer details remain hidden unless developer mode is explicitly enabled.

## Configuration Test API Wiring

Configuration test remains an explicit mock repository because there is no dedicated configuration-test endpoint yet.

Missing endpoint:

- `POST /v1/android-merchant/configuration-test`

The synthetic/configuration test model does not confirm real payments.

## Real-device Visual QA

Android build and unit validation passed. The debug APK was installed and launched on the authorized Samsung SM-S916B device `R5CWA0FEPZW`.

UI-tree inspection covered:

- onboarding and Notification Access gate;
- five-bank selection;
- receiving method setup;
- configuration test;
- dashboard;
- receiving methods list;
- review queue and payment detail;
- connected site screen;
- Receiver health/settings;
- debug-only local tools area.

The inspected merchant screens showed simple merchant labels and masked route identifiers. No raw card, raw phone, raw notification text, package/cert, HMAC, webhook secret or official bank confirmation wording was observed in the merchant-facing screen dumps.

## API Gaps

Updated `.swimpay-agent/ANDROID_FRONTEND_API_GAPS.md` and `docs/ANDROID_FRONTEND_API_CONTRACTS.md`.

Remaining mock-only areas:

- dashboard summary;
- payment detail by id;
- connected site/webhook status;
- connected site test action;
- configuration test action.

## Tests

Added `AndroidMerchantApiWiringTest.kt` covering:

- auth/session safe visible state and local/dev labeling;
- receiving route list/create/patch mappings;
- raw card/phone clearance after submit;
- review queue mapping and reason label translation;
- confirm, reject-signal and reject-order endpoint contracts;
- Android not sending developer webhooks directly;
- explicit mock repository boundaries for missing backend endpoints.

Updated the Android runnable app static test so `MainActivity` must reference the Sprint 7E API repositories and refresh path.

## Validation

- `npm run android:doctor` - passed
- `npm run typecheck` - passed
- `npm run lint` - passed
- `npm test` - passed, 52 files / 360 tests
- `npm run build` - passed
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - passed
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - passed after Docker was restarted by the user; services healthy
- `GET http://localhost:8080/api-health` - passed after Docker restart
- `./gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1` - passed
- `./gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` - passed
- `adb devices -l` through local SDK platform-tools - passed, authorized `R5CWA0FEPZW` connected
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk` - passed
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity` - passed
- `adb -s R5CWA0FEPZW shell uiautomator dump` viewport scans - passed

## Blockers

No critical blockers.

Non-critical follow-up:

- Dashboard, connected-site and configuration-test screens still need dedicated backend/mobile endpoints.

## Next Recommended Sprint

Sprint 7F - Android real-device merchant visual QA completion and mobile backend gap closure.
