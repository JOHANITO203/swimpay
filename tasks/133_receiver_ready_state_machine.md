# 133 - Receiver Ready State Machine

## Goal

Define a clear Receiver readiness state machine.

## States

- `not_installed`
- `installed`
- `notification_access_required`
- `bank_selection_required`
- `backend_config_required`
- `device_registration_required`
- `ready_review_only`
- `ready`
- `degraded`

## V1 Rule

`TO_VERIFY` banks may reach `ready_review_only`, not any auto-confirm readiness state.

## Status

Completed in Phase 4J.
