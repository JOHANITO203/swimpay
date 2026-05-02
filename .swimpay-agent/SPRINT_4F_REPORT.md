# Sprint 4F Report - Device-side Network Smoke Wiring

generated_at: 2026-05-02T22:09:47+03:00

status: PASS

## Tasks Created

- `090_android_debug_backend_config`
- `091_android_debug_http_client`
- `092_android_debug_register_heartbeat_actions`
- `093_android_debug_synthetic_signal_upload_action`
- `094_android_debug_outbox_enqueue_flush_actions`
- `095_real_device_app_side_smoke_execution`
- `096_sprint_4f_closeout_review`

## Tasks Completed

- 090 completed: debug backend config defaults to `http://127.0.0.1:8080` for adb reverse.
- 091 completed: debug-safe HTTP client supports health, register, heartbeat and signal upload endpoints.
- 092 completed: app-side register and heartbeat debug actions call the local backend.
- 093 completed: app-side synthetic redacted signal upload calls the local backend and returns backend-decision-pending wording.
- 094 completed: debug outbox enqueue and flush actions execute from the device app.
- 095 completed: real-device app-side smoke passed on device `R5CWA0FEPZW`; final ADB verification saw the same phone through wireless alias `adb-R5CWA0FEPZW-Xl6cnq._adb-tls-connect._tcp`.
- 096 completed: Sprint 4F reports updated.

## Debug Backend Config

- Device-side URL: `http://127.0.0.1:8080`
- Host route: `http://localhost:8080/api-health`
- Required ADB reverse: `adb -s <authorized-device-serial> reverse tcp:8080 tcp:8080`
- Debug cleartext HTTP is scoped to the debug source set and localhost only.
- No production URL was hardcoded.

## Debug HTTP Client

The Android debug client supports:

- `GET /api-health`
- `POST /v1/receiver-devices/register`
- `POST /v1/receiver-devices/heartbeat`
- `POST /v1/receiver/signals`

The client uses JSON, timeouts and safe status messages. It does not log full payloads, raw phone numbers, raw notification text, secrets or API keys.

## Signature Fix

Initial real-device signal upload returned `401` because Kotlin canonical JSON used `joinToString` default separators with spaces, while the backend HMAC signature verifier uses compact stable JSON.

Fix:

- Added compact `stableDebugJson`.
- Added a deterministic test vector for the debug signal signature.
- Rebuilt and reran the real-device smoke successfully.

## Real Device Execution

- Device serial: `R5CWA0FEPZW`
- Final verification serial: `adb-R5CWA0FEPZW-Xl6cnq._adb-tls-connect._tcp`
- Device model: Samsung `SM_S916B`
- Authorization: authorized
- APK install: PASS
- App launch: PASS
- ADB reverse `tcp:8080 tcp:8080`: PASS

## App-side Smoke Results

UI automation through adb tapped the debug actions in the app:

- Register receiver: PASS, `Success: receiver registration success`
- Send heartbeat: PASS, `Success: receiver heartbeat success`
- Upload synthetic signal: PASS, `Success: notification signal uploaded; backend decision pending; not official bank confirmation`
- Queue synthetic outbox signal: PASS, `Success: queued redacted notification signal; backend decision pending; not official bank confirmation`
- Flush outbox: PASS, `Success: outbox flush result: acked=1 failed_retrying=0; backend decision pending; not official bank confirmation`

## Backend Health

- Docker Compose services: healthy
- Correct API health URL: `http://localhost:8080/api-health`
- Health dependencies: database OK, NATS OK, Valkey OK
- API container port `3000` remains private.

## Safety Checks

- No real bank notification used.
- No real customer data used.
- No SMS permission added.
- No bank scraping or Accessibility service added.
- No Android payment confirmation added.
- No Android auto-confirmation added.
- No raw phone uploaded or displayed.
- No raw notification text uploaded or displayed.
- Synthetic package/cert metadata remains `TO_VERIFY`.
- UI wording says backend decision pending and not official bank confirmation.

## Tests Added

- Android JVM tests for debug backend config.
- Android JVM tests for debug HTTP transport/client boundaries.
- Android JVM tests for app-side register, heartbeat and signal upload actions.
- Android JVM tests for compact canonical HMAC signature generation.
- Android JVM tests for outbox enqueue/flush success and failure behavior.
- Static Vitest checks for Sprint 4F task files, debug config/client and no unsafe Android behavior.

## Validation

PASS:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `GET http://localhost:8080/api-health`
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace`
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace`
- `adb devices -l`
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080`
- `adb -s adb-R5CWA0FEPZW-Xl6cnq._adb-tls-connect._tcp reverse tcp:8080 tcp:8080`
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity`

## Non-critical Limitations

- The debug outbox smoke path is in-memory within the debug controller. It validates app-side enqueue/flush network behavior, but it is not yet a full persistent encrypted-storage plus WorkManager end-to-end path.
- The main status screen still reports backend reachability from static status state until a future live health status model is wired.
- Real bank package/certificate verification still requires a human/operator workflow and real Android PackageManager evidence.

## Next Recommended Sprint

Sprint 4G - Android persistent outbox and backend status polish:

- Wire debug/live outbox smoke to the platform encrypted outbox adapter.
- Add persistent device registration state for debug smoke.
- Add live backend health refresh to the status model.
- Validate retry behavior with backend temporarily unreachable.
- Keep all payloads synthetic/redacted until a human-approved real-device test plan exists.
