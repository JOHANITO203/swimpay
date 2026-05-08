# Backend Signal Ingestion Readiness

Date: 2026-05-08

No real notifications were processed.

## Result

Status: ready with staging synthetic proof pending.

Backend signal ingestion has strong unit/API coverage for signed redacted signal acceptance and rejection paths.

## Evidence

- `apps/api/src/signals.ts`
- `apps/api/src/signals.test.ts`
- `apps/api/src/receiver-devices.test.ts`
- `docs/11_SECURITY_AND_PRIVACY.md`

## Checks

| Check | Status | Notes |
| --- | --- | --- |
| Signed signal accepted | ready | API test stores signal and emits `signal.received`. |
| Invalid signature rejected | ready | API test returns `invalid_signature`. |
| Duplicate event_id rejected | ready | API test returns `duplicate_event_id`. |
| Duplicate notification_hash rejected | ready | API test returns `duplicate_notification_hash`. |
| local_counter regression rejected | ready | API test returns `local_counter_regression`. |
| stale/future observed_at rejected in production mode | ready | Stale production envelope test exists; add future timestamp regression if desired. |
| revoked/inactive receiver rejected | ready | Test covers inactive, suspended, revoked, needs_reconnect, notification_access_missing, bank_targets_missing. |

## Missing Proof

Staging upload from installed APK and database-backed replay proof.

