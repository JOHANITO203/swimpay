# 106 - Persistent Outbox Migration and Cleanup

Status: completed

Scope:
- Add migration from old local outbox storage into protected storage.
- Add retention cleanup for old acked and expired records.

Acceptance:
- Migration dedupes by event id and notification hash.
- Old acked records are purged after retention.
- Expired records are purged or withheld from upload.
