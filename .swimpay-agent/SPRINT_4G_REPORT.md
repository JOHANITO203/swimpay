# Sprint 4G Report - Android Persistent Outbox and Live Status Hardening

generated_at: 2026-05-02T23:00:00+03:00

status: PASS

## Tasks Completed

- `097_android_persistent_device_state`
- `098_android_persistent_protected_outbox`
- `099_android_workmanager_retry_live_wiring`
- `100_android_live_backend_status_refresh`
- `101_android_debug_panel_persistence_polish`
- `102_real_device_offline_online_persistent_outbox_smoke`
- `103_sprint_4g_closeout_review`

## Persistent Device State

The debug app persists safe receiver state: device id, status, server time, app version, registration and heartbeat timestamps, debug backend URL and last local counter. The local counter prevents backend anti-replay failures after process recreation. Raw phone patterns, raw notification text and secret-like values are rejected.

## Persistent Protected Outbox

The debug outbox now persists redacted signed payload records through a SharedPreferences-backed protected storage boundary. It dedupes by `event_id` and `notification_hash`, tracks attempt/retry/ack timestamps and rejects obvious raw phone or raw notification text. This is local MVP hardening, not production-grade encryption.

## WorkManager / Retry

Retry policy is bounded: immediate, 30s, 2m, 5m, then 15m capped. Manual debug flush can retry persisted failed entries. The existing WorkManager boundary remains present; a full production background processor still needs future platform validation.

## Live Backend Status

The status screen refreshes `http://127.0.0.1:8080/api-health` through adb reverse and displays safe reachability, last check time and redacted status summary only.

## Real Device Offline/Online Smoke

- Device: Samsung `SM_S916B`
- Serial: `R5CWA0FEPZW`
- APK install: PASS
- App launch: PASS
- Register: PASS
- Heartbeat: PASS
- Enqueue persistent outbox signal: PASS
- Offline flush with local proxy stopped: PASS, `acked=0 failed_retrying=1`
- Online flush after proxy restart: PASS, `acked=1 failed_retrying=0`
- Backend health after restart: PASS

Removing adb reverse was inconclusive because the same phone had USB and wireless ADB transports. The reliable offline simulation stopped only the local Caddy proxy and restarted it after the failed flush.

## Tests Added

- Android JVM tests for device state persistence and PII rejection.
- Android JVM tests for backend live status refresh.
- Android JVM tests for retry policy boundaries.
- Android JVM tests for outbox reload, dedupe, retry and ack timestamps.
- Android JVM tests for debug controller persistence across recreation.
- Static Vitest checks for Sprint 4G queue, persistent stores, live status and debug-only broadcast automation.

## Safety

- No real bank notification used.
- No real customer data used.
- No SMS permission added.
- No Accessibility scraping service added.
- No Android payment confirmation or auto-confirmation.
- No raw phone or raw notification text stored/uploaded.
- `TO_VERIFY` remains untrusted.

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
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`
- debug broadcast smoke actions

## Non-critical Limitations

- SharedPreferences outbox is not production-grade encrypted storage.
- Full WorkManager background outbox execution still needs platform validation.
- Android Keystore-backed production storage hardening remains future work.
- Real bank package/cert verification remains out of scope.

## Next Recommended Sprint

Sprint 4H - Android production storage and worker hardening.

