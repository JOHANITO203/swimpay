# 102 Real Device Offline Online Persistent Outbox Smoke

## Goal

Run or document the safest possible real-device smoke for persistent outbox offline/online behavior.

## Scope

- Use the authorized real device if available.
- Verify local backend health and adb reverse.
- Build/install/launch debug APK.
- Use synthetic redacted data only.
- Try offline/online outbox flow if automatable; otherwise document precise manual steps and current result.

## Acceptance Criteria

- Smoke result is recorded honestly.
- No real bank notifications, customer data, raw phone, or raw notification text are used.
- TO_VERIFY metadata does not auto-confirm.

