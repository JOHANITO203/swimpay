# Task 615 - Backend Signal Truth Audit

Status: completed_with_guardrail_fix

Scope:
- Audited receiver registration, heartbeat, receiver identity, public key, signed signal upload, anti-replay, duplicate hashes, local counter monotonicity, timestamp tolerance and raw field rejection.

Result:
- Main audit: `.swimpay-agent/BACKEND_SIGNAL_SOURCE_TRUTH_AUDIT.md`.
- Aligned: receiver belongs to merchant, private key never leaves Android, public key registered server-side, signature verification required, duplicate `event_id` and `notification_hash` rejected, local counter regressions rejected, stale/future timestamps rejected in production, inactive/revoked/action-required receivers rejected, stored signal payload is redacted/safe.
- Fixed: legacy receiver signal shape now rejects nested raw notification, phone, card and credential fields before normalization.

Validation:
- Added focused regression in `apps/api/src/signals.test.ts`.
- Red result observed before fix; targeted test passes after fix.
