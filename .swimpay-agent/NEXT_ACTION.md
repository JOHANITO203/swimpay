# Next Action

generated_at: 2026-05-02T21:34:45+03:00

## Latest Completed Sprint

Sprint 4E - Backend Live Smoke + Receiver Debug Triggers.

## Status

PASS_WITH_NON_CRITICAL_LIMITATION.

## What Passed

- Docker Compose backend starts locally.
- Correct API health URL is `http://localhost:8080/api-health`.
- API health reports database, NATS and Valkey OK.
- Real device `R5CWA0FEPZW` is authorized.
- ADB reverse `tcp:8080 tcp:8080` passed.
- APK build, install and launch passed.
- Android app now reads live Notification Access state.
- Debug-only smoke actions are visible and use safe wording.
- Synthetic receiver registration passed through local backend.
- Synthetic heartbeat passed through local backend.
- Synthetic redacted signal upload passed and returned `backend_decision_pending`.

## Remaining Limitation

The debug smoke panel does not yet execute the real HTTP registration/heartbeat/upload/outbox flows from the device app itself. The backend smoke was executed through a local synthetic helper against the same local backend. Full app-side network wiring should be the next sprint.

## Next Recommended Sprint

Sprint 4F - Device-side network smoke wiring.

Recommended tasks:

1. Add debug-only Android HTTP client wiring for register, heartbeat and synthetic upload.
2. Persist synthetic debug device id safely in debug state.
3. Wire debug outbox enqueue/flush to encrypted outbox and WorkManager boundaries.
4. Rerun real-device smoke through the app over `adb reverse tcp:8080 tcp:8080`.
5. Keep every payload synthetic, redacted and marked as backend decision pending.

## What Not To Do Next

- Do not deploy.
- Do not push without explicit request.
- Do not use real bank notifications.
- Do not add SMS permissions.
- Do not add accessibility scraping.
- Do not implement Android payment confirmation.
- Do not implement Android auto-confirmation.
- Do not trust `TO_VERIFY` package names or certificate fingerprints.
- Do not store raw phone or raw notification text.
