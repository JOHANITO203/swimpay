# 098 Android Persistent Protected Outbox

## Goal

Replace the debug in-memory outbox path with persistent protected storage boundaries for redacted signed signal payloads.

## Scope

- Persist redacted/signed payload metadata only.
- Support statuses: `captured`, `pending_upload`, `uploading`, `acked`, `failed_retrying`, `expired`.
- Track `local_id`, `event_id`, `notification_hash`, optional `semantic_hash`, `payload_hash`, redacted/signed payload, attempts, retry timestamps, ack timestamp.
- Dedupe by `event_id` and `notification_hash`.
- Avoid raw phone and raw notification text.

## Acceptance Criteria

- Enqueue persists.
- Reload restores pending entries.
- Dedupe works for event id and notification hash.
- Ack/failure/expiration update state.
- Expired entries are not flushed.
- Tests prove raw PII is not stored.

