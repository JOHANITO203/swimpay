# 101 Android Debug Panel Persistence Polish

## Goal

Make debug smoke actions use persistent device state and persistent outbox state.

## Scope

- Store device id after registration.
- Reuse stored device id for heartbeat, synthetic upload, outbox enqueue, and flush.
- Persist outbox entries.
- Keep UI wording: backend decision pending, notification signal, not official bank confirmation.
- Keep debug panel debug-only.

## Acceptance Criteria

- Debug panel survives controller recreation.
- Stored device id is reused.
- Persistent outbox flush updates state.
- Tests cover safe UI/action messages.

