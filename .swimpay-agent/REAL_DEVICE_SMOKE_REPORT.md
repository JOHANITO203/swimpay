# Real Device Smoke Report

generated_at: 2026-05-02T22:09:47+03:00

status: PASS

## Device / ADB

- ADB path used: `C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- Selected serial: `R5CWA0FEPZW`
- Final verification serial: `adb-R5CWA0FEPZW-Xl6cnq._adb-tls-connect._tcp`
- Device status: authorized
- Model: `SM_S916B`
- APK install: PASS
- App launch: PASS
- ADB reverse: `tcp:8080 tcp:8080` PASS

The device list also showed a wireless ADB alias for the same phone. The USB serial `R5CWA0FEPZW` was used for the app-side smoke run; final verification used the authorized wireless alias and re-established `tcp:8080 tcp:8080`.

## Backend

- Docker Desktop engine: running
- Correct API health URL: `http://localhost:8080/api-health`
- API health: PASS
- Dependencies: database OK, NATS OK, Valkey OK
- `localhost:3000/health`: expected to fail in Compose mode because API port 3000 is private.

## Notification Access

- Android system Notification Access: enabled
- App live UI status: enabled
- Listener UI status: connected

No SMS permission or Accessibility scraping service is declared.

## Debug Panel

The app-side debug panel is visible in the debug APK and executes real local backend calls through:

```text
adb reverse tcp:8080 tcp:8080
http://127.0.0.1:8080
```

## App-side Smoke

All actions used synthetic redacted data only:

- Registration: PASS from the Android app, `receiver registration success`
- Heartbeat: PASS from the Android app, `receiver heartbeat success`
- Synthetic redacted signal upload: PASS from the Android app, `backend decision pending`
- Outbox enqueue: PASS from the Android app, redacted notification signal queued
- Outbox flush: PASS from the Android app, `acked=1 failed_retrying=0`

## Root Cause Fixed During Smoke

Initial signal upload returned `401` due to Kotlin canonical JSON including spaces in HMAC input. The backend uses compact stable JSON. The Android debug signer now uses compact stable JSON and has a deterministic signature test vector.

## Safety

- No real bank notification used.
- No real customer data used.
- No SMS permission added.
- No SMS reading.
- No bank scraping.
- No Accessibility scraping.
- No Android payment confirmation.
- No Android auto-confirmation.
- No raw phone uploaded or displayed.
- No raw notification text uploaded or displayed.
- No official bank confirmation claim.
- `TO_VERIFY` package/cert metadata remains untrusted.

## Remaining Non-critical Limits

- Debug outbox state is currently in-memory for smoke execution.
- Persistent encrypted outbox plus WorkManager retry needs deeper real-device validation.
- Real bank package/cert verification remains out of scope.

## Next Step

Sprint 4G should harden persistent outbox/device-state behavior and live backend status refresh in the Android app.
