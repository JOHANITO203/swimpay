# Sprint 7F Revalidation Report

## 2026-05-04T17:36:31+03:00 Continuation

status: code_and_android_passed_live_backend_blocked_by_local_docker

This continuation focused on the Android premium merchant contract/API wiring and local validation after the UI refactor. No product API, state machine, payment decision logic, real notification processing, SMS access, scraping path, official bank confirmation behavior or auto-confirmation was added.

### Current Validation Result

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` - 54 files / 372 tests
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- Android `:app:testDebugUnitTest` with `ANDROID_HOME` and `ANDROID_SDK_ROOT` set to `C:\Users\Lenovo\AppData\Local\Android\Sdk`
- Android `:app:assembleDebug` with the same SDK env
- `adb devices -l`
- `adb -t 25 reverse tcp:8080 tcp:8080`
- `adb -t 25 install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`
- `adb -t 25 shell am start -n com.swimpay.receiver/.MainActivity`
- `adb -t 25 shell uiautomator dump /sdcard/swimpay-window.xml`
- `adb -t 25 shell screencap -p /sdcard/swimpay-current.png`
- After the build-safe runtime fix, ADB transport changed; the rebuilt APK was reinstalled and relaunched successfully through `transport_id:4`.

Blocked by local Docker Desktop state:

- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health`

Docker error:

```text
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

API health error:

```text
Impossible de se connecter au serveur distant
```

### Android Premium Contract/API Wiring

Passed by Android JVM tests.

- Added `PremiumMerchantRuntime` as the integration boundary between the premium Compose UI and the existing Sprint 7F Android merchant repositories.
- Premium dashboard, reviews, payment detail, connected site and configuration summaries now load through typed repository contracts when backend access is available.
- Review confirm/reject actions remain backend-owned through repository calls.
- Signal rejection stays signal-scoped by default; order rejection is explicit.
- Android does not send developer webhooks directly.
- Mock/dev fallback remains limited to local/offline behavior and is not documented as a live backend path.
- Multi-agent review follow-up fixed the local/dev auth boundary: `MainActivity` now uses `PremiumMerchantRuntime.forAppBuild()`, while non-debug builds use a disconnected merchant session instead of a test bearer token.
- `/v1/reviews` remains the explicit existing authenticated review API contract for Android merchant queue/actions.

### Real-device Smoke

Passed for install, launch, UI tree and screenshot capture.

Device:

- Samsung SM-S916B
- `R5CWA0FEPZW`
- selected ADB transport: `transport_id:25`

Observed current UI tree:

- App package `com.swimpay.receiver` launched.
- Premium bottom navigation visible.
- Current visible screen: merchant menu/settings shell.
- No live endpoint result could be verified on-device because local Docker/API was not reachable.

### Current Result

Sprint 7F code-level and Android-device validation are passing in this continuation. Sprint 7F live backend validation cannot be marked freshly passed in this session until Docker Desktop exposes `dockerDesktopLinuxEngine` again and `http://localhost:8080/api-health` returns healthy.

status: passed_after_revalidation
generated_at: 2026-05-04T01:44:42+03:00

## Scope

This was a validation/repair pass only. No new product feature, real bank notification processing, SMS access, scraping path, official bank confirmation behavior or auto-confirmation was added.

## Docker Health

Result: passed.

- `docker version --format 'Client={{.Client.Version}} Server={{.Server.Version}}'`: `Client=28.4.0 Server=28.4.0`.
- `docker info --format 'ServerVersion={{.ServerVersion}} ContainersRunning={{.ContainersRunning}} Driver={{.Driver}}'`: `ServerVersion=28.4.0 ContainersRunning=9 Driver=overlayfs`.
- `docker compose version`: `Docker Compose version v2.39.2-desktop.1`.

## Compose Status

Result: passed.

- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`: Postgres, Valkey, NATS, API, web, proxy, signal worker and job worker are healthy.
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --build swimpay-api proxy`: passed after the web healthcheck was aligned to the app liveness route.

Validation repair:

- The local `swimpay-web` container was unhealthy because Compose checked `/health` while the current web server exposes `/` as its liveness page. The Compose healthcheck was changed from `/health` to `/`.
- The existing Postgres volume predated Sprint 7A/7B migrations. Additive migrations `006_checkout_bank_selection.sql` and `007_hybrid_receiving_routes.sql` were applied manually to the local volume with `psql -v ON_ERROR_STOP=1`.

## API Health

Result: passed.

`Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` returned HTTP 200 with:

- `database=ok`
- `nats=ok`
- `valkey=ok`

## Sprint 7F Live Endpoint QA

Result: passed with local dev UUID merchant token.

The live Compose database uses UUID merchant ids. Endpoint QA used the existing local merchant:

`00000000-0000-4000-8000-000000000001`

Verified through `http://localhost:8080`:

- `GET /v1/android-merchant/dashboard-summary`: HTTP 200, `official_bank_confirmation=false`.
- `GET /v1/android-merchant/payments/:id`: HTTP 200 for an existing local review id, masked receiving method, `official_bank_confirmation=false`.
- `GET /v1/android-merchant/connected-site`: HTTP 200, merchant mode hides developer details, `official_bank_confirmation=false`.
- `GET /v1/android-merchant/connected-site?developer_mode=true`: HTTP 200, developer details explicitly enabled.
- `POST /v1/android-merchant/connected-site/test`: HTTP 202, `test_queued`, `android_sent_webhook_directly=false`, `official_bank_confirmation=false`.
- `POST /v1/android-merchant/configuration-test`: HTTP 200, non-confirming `action_required` checklist, `confirms_real_payment=false`, `emits_payment_confirmed_webhook=false`.

Additional validation-only robustness:

- Some old local review rows have no linked order/payment session. `GET /v1/android-merchant/payments/:id` now safely skips receiving-route lookup when the review is unlinked instead of producing a UUID parse error.
- Added a regression test in `apps/api/src/android-merchant.test.ts`.

## Real-device QA

Result: passed for install, launch, adb reverse and UI-tree smoke.

Device:

- `R5CWA0FEPZW`
- Samsung SM-S916B

Commands:

- `adb devices -l`: authorized device found.
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080`: returned `8080`.
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`: `Success`.
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity`: launched `MainActivity`.
- `adb -s R5CWA0FEPZW exec-out uiautomator dump /dev/tty`: app UI tree captured.

Observed current visible UI:

- Onboarding/Notification Access screen rendered.
- Notification Access showed `Activé`.
- Five-bank selection rendered.
- No forbidden technical/raw-PII visible text was found in the current UI text dump.

## Android Repository Wiring

Result: passed by Android JVM tests.

`AndroidMerchantApiWiringTest.kt` verifies Android repositories call live endpoint paths for:

- `/v1/android-merchant/dashboard-summary`
- `/v1/android-merchant/payments/:id`
- `/v1/android-merchant/connected-site`
- `/v1/android-merchant/connected-site/test`
- `/v1/android-merchant/configuration-test`

Mock fallback remains local/dev/offline only and is not presented as a live backend path.

## Validation Commands

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` - 54 files / 370 tests
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health`
- Android `:app:assembleDebug` with `ANDROID_HOME` and `ANDROID_SDK_ROOT` set to `C:\Users\Lenovo\AppData\Local\Android\Sdk`
- Android `:app:testDebugUnitTest` with the same SDK env
- `adb devices -l`
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080`
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity`
- `adb -s R5CWA0FEPZW exec-out uiautomator dump /dev/tty`

Initial expected failure during Android validation:

- Gradle failed once because the shell had no Android SDK environment. Rerunning with `ANDROID_HOME` and `ANDROID_SDK_ROOT` set to the local SDK path passed.

## Blockers

No current critical blocker.

Standing non-critical limitations:

- Global `gradle` is not in PATH; the Gradle wrapper works.
- Android SDK env must be set explicitly in this shell for Gradle commands.
- Emulator/AVDs are not configured; real device QA used `R5CWA0FEPZW`.

## Result

Sprint 7F can be marked fully passed after revalidation.
