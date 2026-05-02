# 145 — WorkManager Process-death Retry Real Device

## Goal

Validate persistent outbox retry behavior across app/process restart where Android allows it.

## Scope

- Create a synthetic redacted outbox entry.
- Simulate backend unavailable by removing adb reverse or stopping local access.
- Verify pending or failed-retrying state.
- Relaunch/restore backend and verify flush/ack path.
- Document Android force-stop limitations accurately.

## Safety Rules

- No raw PII.
- No raw notification text.
- No infinite retry loop.

## Validation

- Document real-device result or limitation honestly.
