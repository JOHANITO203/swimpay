# Blockers

## Sprint 7M Android Premium Sub-screen States

- No critical blocker introduced.
- Receiving methods, banks and Receiver health now have dedicated premium typed state screens.
- Settings menu rows now navigate to typed premium sub-screens instead of inert placeholders.
- Merchant-facing `SBP` wording was removed from Android premium receiving-method UI copy.
- Targeted Android JVM tests for premium navigation/runtime/visual/copy guardrails passed.
- Root code validation passed: android doctor, typecheck, lint, tests, build and Compose config.
- Android validation passed: full JVM tests and debug APK build.
- Real-device smoke passed on Samsung `SM_S916B` / `R5CWA0FEPZW`; UIAutomator confirmed the new `Banques` sub-screen.
- Non-critical environment blocker: Docker Desktop Linux engine pipe is unavailable from this shell, so fresh `compose ps` and `/api-health` live checks could not be completed.

## Sprint 7J Android Frontend Source-of-truth Cleanup

- No critical blocker introduced.
- Legacy Android merchant visual source files have been purged from the active source tree.
- `ui/premium` is now the Android merchant visual source of truth.
- Remaining non-critical follow-up: local empty directory `ui/screens` may still exist on disk but contains no Kotlin source files and is not tracked by git.
- Next recommended sprint is Sprint 7K: typed premium navigation and reusable screen-state foundation.

Current Sprint 7I live-capture gate:

- No current critical blocker for frontend/Android UI validation.
- No current critical blockers.
- Explicit live-capture operator consent has not yet been recorded. `.swimpay-agent/SBERBANK_SHADOW_CONSENT.md` is `pending_explicit_operator_confirmation`.
- This is a hard gate for any real Sberbank notification shadow capture, not a blocker for Android UI, build or repository validation.

Preflight warning:

- Latest local Sberbank package evidence row for `ru.sberbankmobile` is `production_trust_revoked`, not literal `approved_for_review_only`. Bank profile auto-confirm remains `disabled`, and this is safe from an auto-confirm perspective, but live shadow capture should acknowledge the local evidence state before proceeding.

No real Sberbank notification was captured, read, uploaded, parsed or matched.

## Frontend Browser QA

- No critical blocker introduced.
- Browser screenshot QA completed for merchant and buyer checkout screens.
- Non-critical: local Chrome headless on this Windows machine crops requested 360px captures, so reliable mobile evidence was captured with CSS-equivalent 720px screenshots.
- Non-critical: final visual acceptance should still be checked by the user in the real app/browser/device flow.
- Backend APIs, contracts, workers, database, payment logic, Android notification processing, real bank notifications and auto-confirmation were not changed.

## Buyer Checkout UX Realignment

- No critical blocker introduced.
- Non-critical: the desktop QR handoff is a safe visual placeholder; a real QR generator can be added later if it encodes only the checkout session URL and never raw card/phone details.
- Non-critical: buyer checkout browser screenshot QA is recommended to tune spacing on small mobile, tablet and desktop viewports.
- Real bank notifications, backend APIs, contracts, workers, payment logic, database, webhooks and Android notification processing were not changed.

## Frontend Screen Inventory / Realignment

- No critical blocker introduced.
- Non-critical: browser/device screenshot QA is still recommended before calling the visual polish complete.
- Non-critical: several web merchant routes are static/demo renderers and should not be treated as new backend integrations.
- Non-critical: buyer checkout status states are audited as partial visual states and can be polished later without API changes.

## Current Local Backend Validation Blocker

- 2026-05-04T17:36:31+03:00: Docker Desktop is not reachable from this shell.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` failed with `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`.
- `http://localhost:8080/api-health` is unreachable while Docker is down.
- This blocks fresh live backend/API health validation only. Code validation, Android JVM tests, APK build, ADB install and app launch passed.
- Per user instruction, Docker was not restarted or repaired by the agent in this pass.

## Android Premium API Wiring

- Premium Android merchant UI is now connected to the existing Sprint 7F Android merchant repositories through `PremiumMerchantRuntime`.
- Debug builds can use local/dev auth (`Bearer test_<merchant_id>`) for local QA.
- Non-debug builds now use a disconnected merchant session rather than a test bearer token.
- Remaining non-critical limitation: production merchant auth/session handoff remains the next contract/API hardening step.

## Frontend Realignment Notes

- No critical blocker found during the UI refactor.
- Remaining non-critical follow-up: browser screenshot QA is still needed to tune spacing and responsive details against the provided mockups.
- No product/API/security blocker was introduced.

Last checked during Sprint 7F revalidation: 2026-05-04T01:44:42+03:00.

## Resolved Environment Issue

- Docker Desktop/containerd is responding again after local recovery.
- `docker version`, `docker info` and `docker compose version` succeeded.
- Compose config renders successfully.
- Postgres, Valkey, NATS, API, web, proxy, signal worker and job worker are healthy.
- API health through the local proxy returns database, NATS and Valkey as `ok`.
- Sprint 7F live endpoint QA through `http://localhost:8080` passed after applying additive local-volume migrations `006` and `007`.
- Real-device install/launch/UI-tree smoke on `R5CWA0FEPZW` passed.

## Validation Note

- The Compose `swimpay-web` container was unhealthy because its healthcheck called `/health`, while the web app currently serves `/` as the lightweight liveness page.
- Fixed the Compose healthcheck to call `/` instead. This is an infra validation repair, not a product API change.
- The existing Postgres volume predated Sprint 7A/7B migrations; additive migrations `006_checkout_bank_selection.sql` and `007_hybrid_receiving_routes.sql` were applied manually with `psql`.

## Standing Non-critical Limitations

- Global `gradle` is still not available in PATH; use the checked-in Android Gradle wrapper.
- Android SDK path on this machine is `C:\Users\Lenovo\AppData\Local\Android\Sdk`.
- Android Emulator command and AVDs are not configured; real device `R5CWA0FEPZW` is available through adb.
- Real bank notifications remain out of scope until the explicit real-notification shadow consent gate is used.
- Real-bank auto-confirmation remains disabled.

## Sprint 7J Android Frontend Source-of-truth Cleanup

- No critical blocker introduced.
- `ui/premium` is now the only active Android merchant visual source of truth.
- Legacy `ui/screens` Kotlin files and old mock visual renderer/component/design files were deleted.
- Preserved runtime/API/guardrail files remain in place.
- Validation passed: android doctor, typecheck, lint, tests, build, Compose config, Android JVM tests, Android APK build.
- Real-device smoke passed on Samsung `SM_S916B` / `R5CWA0FEPZW` via SDK ADB transport.
- Remaining non-critical limitation: ADB is not in PATH; use `C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe`.

## Sprint 7K Android Premium Navigation and State Foundation

- No critical blocker introduced.
- Typed premium routes and tabs were added.
- `PremiumScreenState` and `PremiumStatePanel` were added as frontend-only UI state foundations.
- Validation passed: android doctor, typecheck, lint, tests, build, Compose config, Compose ps, API health, Android JVM tests and Android debug APK build.
- Real-device smoke passed through the connected Samsung device using ADB transport id `3`.
- Backend/API/contracts/payment/review/notification behavior was not changed.
- Remaining non-critical follow-up: current dashboard/review/detail screens still need a full state rollout so preview content is not shown during every non-success condition.

## Sprint 7L Android Premium Screen State Rollout

- No code or Android UI critical blocker introduced.
- Dashboard, review queue, payment detail, orders and menu sub-screens now use typed `PremiumScreenState` surfaces.
- Empty/error/action-required states no longer fall back to preview payment/order data.
- Review action buttons are shown only when a real payment detail content state is available.
- Android review actions remain backend-owned and Android still does not send developer webhooks directly.
- Targeted and full Android JVM tests passed with in-process Kotlin compilation after an initial local JVM native-memory failure.
- Real-device ADB install/launch passed on Samsung `SM_S916B` / `R5CWA0FEPZW`.
- The installed APK mojibake observed through UIAutomator was fixed and revalidated: `Données indisponibles` and `RÉESSAYER` now render correctly.
- Environment blocker: fresh Docker live checks are currently blocked because `//./pipe/dockerDesktopLinuxEngine` is unavailable from this shell. `docker compose ... config` still renders, but `docker compose ... ps` and `http://localhost:8080/api-health` cannot be freshly verified until Docker Desktop is restarted/recovered.
- Remaining non-critical follow-up: banks, Receiver health and order detail remain premium placeholder state screens pending dedicated frontend contracts.
