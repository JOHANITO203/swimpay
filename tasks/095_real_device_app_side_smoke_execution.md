# 095 Real Device App Side Smoke Execution

## Goal

Run the safest possible real-device smoke path from the Android app through `adb reverse`.

## Scope

- Verify local backend health at `http://localhost:8080/api-health`.
- Verify authorized adb device.
- Set `adb reverse tcp:8080 tcp:8080`.
- Build, install and launch the debug APK.
- Trigger app-side debug actions manually or via adb UI automation if safe.

## Forbidden

- Do not use real bank notifications.
- Do not use real customer data.
- Do not claim automated pass unless actions actually execute.

## Acceptance Criteria

- Report backend, adb reverse, install, launch and app-side action status.
- If UI automation is not reliable, document exact manual tap path.
- No raw PII is used.

