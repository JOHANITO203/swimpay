# 045 - Receiver Encrypted Outbox Retry Loop

## Goal

Implement a testable local outbox model for redacted signed receiver uploads.

## Scope

- Store only encrypted/redacted/signed payload references.
- Support `captured`, `pending_upload`, `uploading`, `acked`, `failed_retrying` and `expired`.
- Track attempts, timestamps and deterministic retry schedule.
- Document Android Keystore/encrypted storage as future platform implementation.

## Acceptance Criteria

- Enqueue, dedupe, ack, retry and expiration are tested.
- Raw phone and raw notification text are not stored.
