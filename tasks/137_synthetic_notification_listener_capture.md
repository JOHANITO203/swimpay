# Task 137 - Synthetic NotificationListener Capture

Status: completed

## Goal

Replay the debug-only synthetic notification source on a real Android device and verify that `SwimPayNotificationListenerService` receives it.

## Scope

- Verify local backend health at `http://localhost:8080/api-health`.
- Re-establish `adb reverse tcp:8080 tcp:8080`.
- Build, install and launch the debug APK.
- Trigger the debug-only synthetic notification.
- Capture safe listener diagnostics only: package, notification id/tag, post time, detected field count and snapshot count.

## Guardrails

- No raw full notification text in production logs.
- No real bank notification content.
- Synthetic package/cert metadata must remain `synthetic_debug_only`.
