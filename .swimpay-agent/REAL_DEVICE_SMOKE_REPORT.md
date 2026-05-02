# Real Device Smoke Report

generated_at: 2026-05-02T21:58:00+03:00
status: PARTIAL_PASS_BACKEND_BLOCKED

## Summary

The connected Android phone was detected and authorized through ADB. The SwimPay Receiver debug APK was built, installed and launched on the real device. ADB reverse for local backend access was configured. Notification Access was enabled at Android system level.

Live receiver registration, heartbeat, synthetic signal upload and outbox online/offline smoke could not run because the local backend is unavailable and Docker Desktop's Linux engine is not running.

## Device

- adb path: `C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- selected serial: `R5CWA0FEPZW`
- model: `SM_S916B`
- product: `dm2qxxx`
- authorization: authorized

## APK Status

- build: PASS
- install: PASS
- package: `com.swimpay.receiver`
- activity: `com.swimpay.receiver/.MainActivity`
- launch: PASS

## App UI

UI dump showed the SwimPay Receiver status screen:

```text
SwimPay Receiver
Notification access: disabled
Listener: disconnected
Allowed banks: 0
Queue length: 0
Backend: unreachable
Warnings: notification_access_disabled, listener_disconnected, no_banks_allowed, backend_unreachable
```

Android system Notification Access is enabled. The UI mismatch is a known MVP limitation: live platform state is not wired into the status screen yet.

## adb reverse

Status: PASS.

```text
UsbFfs tcp:3000 tcp:3000
```

Phone-side debug backend URL:

```text
http://127.0.0.1:3000
```

## Notification Access

Status: PASS at Android system level.

Enabled listener:

```text
com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService
```

No attempt was made to bypass Android settings.

## Registration Result

Status: BLOCKED.

Reason:

- local API at `http://localhost:3000/health` is not responding;
- Docker Desktop Linux engine is not running.

## Heartbeat Result

Status: BLOCKED.

Reason: local backend unavailable.

## Synthetic Signal Upload Result

Status: BLOCKED.

Reason: local backend unavailable and app-side debug trigger is not exposed yet.

Expected future behavior:

- synthetic redacted data only;
- no real bank notification;
- no raw phone;
- no raw notification text;
- `TO_VERIFY` or `pending_verification` metadata remains untrusted;
- accepted upload means backend decision pending, not payment confirmation.

## Outbox Offline/Online Result

Status: NOT AUTOMATED YET.

Reason: app-side debug trigger for enqueue/retry is not exposed; local backend is unavailable.

## Safety

- No real bank notifications used.
- No real customer data used.
- No SMS permission added.
- No SMS reading.
- No bank scraping.
- No Accessibility scraping.
- No Android payment confirmation.
- No Android auto-confirmation.
- No real bank package names or certificate fingerprints invented.
- No production deployment.
- No production secrets modified.

## Blockers

No critical SwimPay blockers.

Current local blockers:

- Docker Desktop Linux engine is not running.
- Local API is not available on `localhost:3000`.
- App status screen does not yet read real Notification Access state dynamically.
- App UI does not yet expose a live registration/heartbeat/synthetic-signal trigger.

## Next Recommended Step

Start Docker Desktop and the local SwimPay backend stack:

```powershell
docker compose --env-file .env.example -f infra/docker-compose.yml up --build
```

Then verify:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/health
adb -s R5CWA0FEPZW reverse tcp:3000 tcp:3000
```

After that, add or run a debug-only app-side smoke trigger for registration, heartbeat and synthetic redacted signal upload.
