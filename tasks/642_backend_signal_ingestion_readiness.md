# Task 642 - Backend Signal Ingestion Readiness

Status: completed_ready_with_live_synthetic_pending

Objective: verify backend signal ingestion readiness.

Checks:
- Signed signal accepted.
- Invalid signature rejected.
- Duplicate event_id rejected.
- Duplicate notification_hash rejected.
- local_counter regression rejected.
- Stale/future observed_at rejected in production mode.
- Revoked/inactive receiver rejected.

Deliverable:
- `.swimpay-agent/BACKEND_SIGNAL_INGESTION_READINESS.md`

Result:
- API tests cover the required ingestion and anti-replay rules.
- Staging proof from installed APK synthetic upload remains pending.

