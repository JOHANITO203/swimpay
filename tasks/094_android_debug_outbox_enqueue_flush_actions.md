# 094 Android Debug Outbox Enqueue Flush Actions

## Goal

Wire debug-only outbox enqueue and flush actions to local app storage behavior.

## Scope

- Queue synthetic redacted signed signal.
- Store only redacted/signed payload.
- Flush due records with the debug HTTP client.
- Mark accepted records `acked`.
- Mark unreachable/failed records `failed_retrying` or pending retry.

## Forbidden

- Do not store raw phone.
- Do not store raw notification text.
- Do not create infinite retry.
- Do not use real bank data.

## Acceptance Criteria

- Tests cover enqueue, flush success, flush failure and no raw PII storage.
- App debug panel can trigger enqueue/flush.
- Backend decisions remain backend-only.

