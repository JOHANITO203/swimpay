# Blockers

No current critical blockers.

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
