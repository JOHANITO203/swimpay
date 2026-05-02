# 068 - Emulator Environment Doctor

## Goal

Inspect Android emulator readiness without faking emulator smoke results.

## Scope

- Detect `adb`.
- Detect Android Emulator command.
- List available AVDs.
- List running devices.
- Locate debug APK.
- Print local backend URL guidance.

## Acceptance Criteria

- `npm run android:emulator-doctor` reports emulator readiness.
- Missing emulator/AVD/device is documented as a non-critical blocker.

## Forbidden Work

- Do not claim emulator validation unless adb confirms a running device and install/launch commands run.
- Do not use real bank apps or real bank data.
