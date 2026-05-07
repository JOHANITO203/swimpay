# Task 527 - Receiver Registration and Session Hardening

## Goals

- Harden receiver registration and heartbeat behavior.
- Ensure receivers are merchant-scoped and cannot cross tenants.
- Reject revoked/inactive receivers for accepted signal uploads.
- Add safe operational states: active, inactive, revoked, needs_reconnect, notification_access_missing, bank_targets_missing, degraded, force_review_local.
- Ensure production rejects local/dev bearer shortcuts.
- Add tests.

## Safety

- Android remains capture/redact/upload only.
- Backend remains the decision owner.

