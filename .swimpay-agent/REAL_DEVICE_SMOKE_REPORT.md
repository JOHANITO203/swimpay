# Real Device Smoke Report

generated_at: 2026-05-02T23:55:28+03:00

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

- Debug outbox state now persists through an Android Keystore-backed protected adapter on device.
- Offline/online persistent outbox smoke passed by stopping/restarting the local Caddy proxy.
- Full WorkManager process-death/reboot retry validation still needs deeper real-device validation.
- Real bank package/cert verification remains out of scope.

## Sprint 4I Synthetic Notification Listener Smoke

- Synthetic notification source: debug-only receiver notification channel.
- Synthetic package: `synthetic_debug_only.com.swimpay.syntheticbank`.
- Synthetic cert: `synthetic_debug_only.cert_sha256`.
- Synthetic notification post: PASS.
- Deterministic notification pipeline broadcast: PASS.
- Outbox/backend result: `acked=1 failed_retrying=0`.
- Backend result wording: `backend decision pending`; no official bank confirmation.

Live NotificationListener capture was not observed after reinstall/data clear because Android Notification Access was no longer enabled for the package. Android requires the user to re-enable the listener after this reset. This is a manual OS permission step, not an application data-path failure.

## Next Step

Sprint 4J should re-enable Notification Access on the device and rerun live synthetic notification capture, then continue process-death/reboot WorkManager validation.

## Sprint 4J-B Real Listener Replay

- generated_at: 2026-05-03T00:52:04+03:00
- status: PASS
- Device serial: `R5CWA0FEPZW`
- Backend health: PASS at `http://localhost:8080/api-health`
- ADB reverse: `tcp:8080 tcp:8080` PASS
- APK build/install/launch: PASS
- Notification Listener Access: enabled for `com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService`
- Synthetic notification capture: PASS
- Listener safe metadata observed: package, notification id/tag, post time, `fields_detected=4`, `result=enqueued`
- Persistent outbox/backend upload: PASS, `acked=1 failed_retrying=0`
- Public/result wording: `backend decision pending`, `notification signal`, `not official bank confirmation`

Safety:

- No real bank notification used.
- No real customer data used.
- No SMS reading.
- No bank app scraping.
- No Accessibility scraping.
- No Android payment confirmation.
- No Android auto-confirmation.
- No raw phone stored/uploaded.
- No raw notification text stored/uploaded.
- `synthetic_debug_only` package/cert metadata remains debug-only and not production trust evidence.

## Sprint 4K Receiver Resilience and Bank Selection Readiness

- generated_at: 2026-05-03T01:20:17+03:00
- status: PASS
- Device serial: `R5CWA0FEPZW`
- Backend health: PASS at `http://localhost:8080/api-health`
- ADB reverse: `tcp:8080 tcp:8080` PASS
- APK build/install/launch: PASS
- Notification Listener Access: enabled for `com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService`
- Bank selection model: PASS
- Selected `TO_VERIFY` profile readiness: `ready_review_only`, not production trusted
- Synthetic debug profile: debug-only, not production trust evidence
- Listener restart resilience: PASS after `am force-stop`, app relaunch and synthetic notification replay
- Restart replay result: listener captured safe metadata, outbox enqueue PASS, backend upload PASS with `acked=1 failed_retrying=0`
- Offline/online persisted outbox smoke: PASS
- Offline result while proxy stopped: `acked=0 failed_retrying=1`
- Online recovery after proxy restore and app relaunch: `acked=1 failed_retrying=0`
- Diagnostics export: safe operator fields only; no raw PII/secrets

Safety:

- No real bank notification used.
- No real customer data used.
- No SMS reading.
- No bank app scraping.
- No Accessibility scraping.
- No Android payment confirmation.
- No Android auto-confirmation.
- No raw phone stored/uploaded.
- No raw notification text stored/uploaded.
- No official bank confirmation claim.
- `TO_VERIFY` and `synthetic_debug_only` metadata remain untrusted for production decisions.

## Sprint 4L Bank Package Evidence Dry Run Readiness

- generated_at: 2026-05-03T01:36:30+03:00
- status: PASS
- Device serial: `R5CWA0FEPZW`
- Device model: Samsung `SM_S916B`
- Backend health: PASS at `http://localhost:8080/api-health`
- ADB reverse: `tcp:8080 tcp:8080` PASS
- APK build/install/launch: PASS
- PackageManager evidence model: PASS
- PackageManager collector boundary: explicit package-name checks only, no installed-app enumeration
- Evidence policy: concrete observations require operator review and do not create production trust
- Real bank package/cert collection: not run

Safety:

- No real bank notification used.
- No real customer data used.
- No SMS reading.
- No bank app scraping.
- No Accessibility scraping.
- No Android payment confirmation.
- No Android auto-confirmation.
- No raw phone stored/uploaded.
- No raw notification text stored/uploaded.
- No official bank confirmation claim.
- `TO_VERIFY`, pending and `synthetic_debug_only` metadata remain untrusted for production decisions.
