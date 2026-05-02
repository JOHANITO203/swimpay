# 085 Debug Only Receiver Smoke Panel

## Goal

Add debug-only Receiver smoke actions for real-device local validation.

## Scope

- Define debug-only actions:
  - register receiver
  - send heartbeat
  - upload synthetic redacted signal
  - enqueue synthetic outbox signal
  - flush outbox
- Use synthetic redacted data only.
- Keep copy explicit that backend decision is pending and no official bank confirmation exists.

## Forbidden Work

- Do not use real bank data.
- Do not upload raw phone or raw notification text.
- Do not add payment confirmation or auto-confirmation to Android.
- Do not expose debug actions as release payment behavior.

## Acceptance Criteria

- Debug actions are gated behind debug build state.
- Tests cover action list and safe wording.
- No raw PII appears in debug payloads or UI text.

