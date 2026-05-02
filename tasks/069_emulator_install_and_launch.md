# 069 - Emulator Install and Launch

## Goal

Install and launch the Android Receiver debug APK on an emulator if a device is available.

## Scope

- Use `adb install` only when a running emulator/device is present.
- Verify package presence through `adb shell pm list packages`.
- Resolve and launch the main activity if install succeeds.
- Document manual launch commands if blocked.

## Acceptance Criteria

- Install status is explicit.
- If blocked, the exact environment reason is documented.

## Forbidden Work

- Do not claim APK install success without adb confirmation.
- Do not require real bank apps.
