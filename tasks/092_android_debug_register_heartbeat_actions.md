# 092 Android Debug Register Heartbeat Actions

## Goal

Wire debug-only Android smoke actions for receiver registration and heartbeat to real app-side HTTP calls.

## Scope

- Register with synthetic safe device data.
- Heartbeat with synthetic safe status data.
- Use local debug backend config.
- Show safe status messages in the debug panel.

## Forbidden

- Do not use real PII.
- Do not use real bank data.
- Do not add payment confirmation wording.

## Acceptance Criteria

- Register action calls the backend through the debug client.
- Heartbeat action calls the backend after registration.
- Tests cover success, missing registration and safe output.

