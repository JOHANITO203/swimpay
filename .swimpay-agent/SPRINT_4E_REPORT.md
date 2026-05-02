# Sprint 4E Report - Backend Live Smoke + Receiver Debug Triggers

generated_at: 2026-05-02T21:34:45+03:00

status: PASS_WITH_NON_CRITICAL_LIMITATION

## Tasks Created

- `083_local_backend_startup_for_real_device`
- `084_android_live_notification_access_status`
- `085_debug_only_receiver_smoke_panel`
- `086_real_device_register_heartbeat_smoke`
- `087_real_device_synthetic_signal_upload_smoke`
- `088_real_device_outbox_offline_online_smoke`
- `089_sprint_4e_closeout_review`

## Tasks Completed

- 083 completed: local backend starts and API health is healthy through the proxy.
- 084 completed: Android status screen reads live Notification Access state.
- 085 completed: debug-only smoke actions are visible in debug builds with safe wording.
- 086 completed: receiver registration and heartbeat smoke passed through the local backend using synthetic data.
- 087 completed: synthetic redacted signal upload passed and returned `backend_decision_pending`.
- 089 completed: closeout reports updated.

## Blocked

- 088 blocked: true app-side outbox offline/online retry is not fully automatable yet. The UI exposes debug action preparation, but the app does not yet perform real network registration/upload/outbox flushing from the device.

## Backend Health

- Correct public local URL: `http://localhost:8080/api-health`
- `localhost:3000` is intentionally closed in Compose mode.
- API dependencies: database OK, NATS OK, Valkey OK.
- Docker services: all SwimPay services healthy.

## ADB / Device

- Selected physical serial: `R5CWA0FEPZW`
- Device model: Samsung `SM_S916B`
- Authorization: authorized
- ADB reverse: `tcp:8080 tcp:8080` PASS
- APK install: PASS
- App launch: PASS with `am start -n com.swimpay.receiver/.MainActivity`

The device list also shows a wireless ADB alias for the same phone. The USB serial `R5CWA0FEPZW` was used consistently.

## Notification Access

PASS.

The UI tree now shows:

```text
Notification access: enabled
Listener: connected
```

No SMS permission or accessibility scraping service was added.

## Debug Smoke Panel

PASS.

The app now shows debug-only actions:

- Register receiver
- Send heartbeat
- Upload synthetic signal
- Queue synthetic outbox signal
- Flush outbox

Wording uses:

- `backend decision pending`
- `notification signal`
- `not official bank confirmation`

The panel does not display raw phone numbers or raw notification text.

## Receiver Smoke Results

Synthetic local backend smoke used merchant:

```text
00000000-0000-4000-8000-000000000001
```

Results:

- `POST /v1/receiver-devices/register`: 201, device created.
- `POST /v1/receiver-devices/heartbeat`: 200, status `active`, warnings empty.
- `POST /v1/receiver/signals`: 201, status `received`, `accepted: true`, `next_action: backend_decision_pending`.

The synthetic signal used `TO_VERIFY` package/cert metadata and redacted fields only.

## Safety Checks

- No Android payment confirmation added.
- No Android auto-confirmation added.
- No SMS permission added.
- No bank app scraping added.
- No real bank package names or cert fingerprints invented.
- No raw phone uploaded.
- No raw notification text uploaded.
- Backend response did not claim official bank confirmation.
- Backend remains the decision authority.

## Validation

PASS:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace`
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace`
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `GET http://localhost:8080/api-health`

## Files Changed Summary

- Dockerfiles for API, signal-worker and job-worker.
- PostgreSQL local Docker config.
- Android Receiver live status and debug smoke UI/model.
- Android JVM tests for live Notification Access and debug smoke actions.
- Deployment and task queue tests.
- Local backend doctor script and package script.
- Sprint 4E task files and local development docs.

## Next Recommended Sprint

Sprint 4F - Device-side network smoke wiring:

- implement real debug-only app-side HTTP client actions for register, heartbeat and synthetic upload;
- wire debug outbox enqueue/flush to actual app storage and WorkManager boundaries;
- keep all actions synthetic, redacted and debug-only;
- rerun real-device smoke from the phone through `adb reverse tcp:8080 tcp:8080`.

