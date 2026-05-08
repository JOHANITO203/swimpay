# Task 640 - Redaction / Outbox / Upload Readiness

Status: completed_partial_staging_upload_pending

Objective: verify redaction, protected outbox and upload readiness.

Checks:
- Raw notification text is temporary only.
- Redacted payload only enters outbox.
- Upload rejects raw_text_present=true.
- event_id, notification_hash, semantic_hash, local_counter, payload_hash and signature exist.
- HTTPS staging upload path is used.

Deliverable:
- `.swimpay-agent/REDACTION_OUTBOX_UPLOAD_READINESS.md`

Result:
- Code and JVM/backend tests cover the redaction, outbox and upload boundaries.
- Installed APK synthetic upload to `https://staging.swimpay.pro/v1/receiver/signals` remains pending.

