# 142 — Receiver Ready Review-only State

## Goal

Ensure the receiver readiness state machine correctly separates review-only detection readiness from full trusted readiness.

## Scope

- Preserve readiness states:
  - `notification_access_required`
  - `bank_selection_required`
  - `backend_config_required`
  - `device_registration_required`
  - `ready_review_only`
  - `ready`
  - `degraded`
- With `TO_VERIFY` or pending bank metadata, allow `ready_review_only`.
- Do not allow unverified banks or synthetic debug banks to create production trust.

## Validation

- Add tests for listener on + backend ok + registered + selected `TO_VERIFY` bank.
- Add tests for no bank and listener off.
- Add tests that trusted synthetic debug banks do not create production trust.
