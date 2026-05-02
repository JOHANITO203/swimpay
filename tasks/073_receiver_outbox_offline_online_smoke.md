# 073 - Receiver Outbox Offline/Online Smoke

## Goal

Validate or document the offline/online outbox smoke path.

## Scope

- Simulate backend unreachable/reachable only if emulator/app automation is available.
- Otherwise document precise manual procedure.
- Ensure no raw PII storage and no infinite retry behavior.

## Acceptance Criteria

- Outbox smoke status is explicit.
- Manual procedure is documented if blocked.

## Forbidden Work

- Do not store raw phone.
- Do not store raw notification text.
- Do not create infinite retry loops.
