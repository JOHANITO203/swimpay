# Real Device Smoke Report

generated_at: 2026-05-02T21:34:45+03:00

status: PASS_WITH_NON_CRITICAL_LIMITATION

## Device / ADB

- ADB path used: `C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- Selected serial: `R5CWA0FEPZW`
- Device status: authorized
- Model: `SM_S916B`
- APK install: PASS
- App launch: PASS
- ADB reverse: `tcp:8080 tcp:8080` PASS

The device list also showed a wireless ADB alias for the same phone. The USB serial `R5CWA0FEPZW` was used consistently.

## Backend

- Docker Desktop engine: running
- Correct API health URL: `http://localhost:8080/api-health`
- API health: PASS
- `localhost:3000/health`: expected to fail in Compose mode because API port 3000 is private.

## Notification Access

- Android system Notification Access: enabled
- App live UI status: enabled
- Listener UI status: connected

The app UI tree showed:

```text
Notification access: enabled
Listener: connected
```

## Debug Panel

- Register receiver action: present
- Send heartbeat action: present
- Upload synthetic signal action: present
- Queue synthetic outbox action: present
- Flush outbox action: present

Actions are debug-only UI/model preparations. Full app-side network execution remains a next-sprint item.

## Backend Smoke

- Registration: PASS through local backend helper with synthetic data.
- Heartbeat: PASS through local backend helper with synthetic data.
- Synthetic redacted signal upload: PASS, returned `backend_decision_pending`.
- Outbox offline/online: BLOCKED for full app-side automation; debug action model is present but not wired to real device network retry yet.

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

## Next Step

Sprint 4F should wire the debug-only app buttons to actual device-side HTTP client calls and outbox retry flow over:

```text
adb reverse tcp:8080 tcp:8080
http://127.0.0.1:8080
```

