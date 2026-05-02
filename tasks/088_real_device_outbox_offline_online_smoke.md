# 088 Real Device Outbox Offline Online Smoke

## Goal

Validate or document the real-device offline/online outbox smoke path.

## Scope

- Simulate backend unreachable where safe.
- Enqueue synthetic redacted signed signal.
- Restore backend/reverse and verify retry or document remaining manual gap.

## Forbidden Work

- Do not store raw phone.
- Do not store raw notification text.
- Do not create infinite retry behavior.

## Acceptance Criteria

- Offline/online outbox behavior is documented.
- Any automation gap is clearly recorded.

