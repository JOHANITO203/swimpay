# 086 Real Device Register Heartbeat Smoke

## Goal

Run or prepare real-device receiver registration and heartbeat smoke against the local backend.

## Scope

- Re-detect the authorized ADB device.
- Re-establish adb reverse to the correct local port.
- Use app debug panel or helper to register a synthetic receiver device.
- Send a signed/safe heartbeat.

## Forbidden Work

- Do not use production backend URLs.
- Do not commit secrets.
- Do not imply payment confirmation.
- Do not use real customer data.

## Acceptance Criteria

- Device serial and adb reverse status are documented.
- Registration and heartbeat either pass or a clear blocker is recorded.

