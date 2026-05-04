# Task 407 - Sberbank Shadow Test Preflight

Status: completed_with_pending_live_capture

Scope:
- Verify local Docker/Compose health.
- Verify `GET http://localhost:8080/api-health`.
- Verify Android debug APK build and unit tests.
- Verify authorized ADB device and `adb reverse tcp:8080 tcp:8080`.
- Verify Receiver app launches.
- Verify Notification Listener Access state.
- Verify Sberbank evidence is review-only.
- Verify no auto-confirm or raw notification storage flags are enabled.

Safety:
- Sberbank only: `sber_ru` / `ru.sberbankmobile`.
- No SMS.
- No Accessibility scraping.
- No bank app scraping.
- No broad installed-app enumeration.
- No raw notification storage.
- No auto-confirmation.

Result:
- Docker Desktop was initially unreachable, then started successfully.
- Compose services are healthy.
- `GET http://localhost:8080/api-health` returned database, NATS and Valkey as `ok`.
- Node and Android validation passed.
- ADB detected authorized device `R5CWA0FEPZW`.
- `adb reverse tcp:8080 tcp:8080` succeeded.
- Debug APK install succeeded.
- Receiver app launch succeeded.
- Notification Listener Access includes `com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService`.
- Exact Sberbank package lookup found `ru.sberbankmobile`.
- Backend Sberbank profile has `auto_confirm_status=disabled`.
- No real Sberbank notification was captured during preflight.
