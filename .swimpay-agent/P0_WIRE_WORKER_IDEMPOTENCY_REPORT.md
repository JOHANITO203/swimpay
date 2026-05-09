# P0-WIRE-1 Worker Idempotency Report

generated_at: 2026-05-09T23:57:28+03:00

## Result

The worker idempotency ledger is now applied to runtime side-effect workers.

## Implemented

Added a shared worker idempotency abstraction:

- `claim`
- `complete`
- `fail`
- stale processing reclaim
- in-memory test implementation
- PostgreSQL implementation over `worker_idempotency_ledger`

## Runtime Wiring

Webhook delivery:

- Each delivery attempt claims `webhook_delivery:{delivery_id}:attempt:{attempt}`.
- Duplicate attempts are skipped before side effects.
- Retry attempts use a new key after the repository increments attempt count.

No-notification fallback:

- Each due payment session claims `no_notification_manual_check:{payment_session_id}` in the same transaction as fallback review/event creation.
- Duplicate fallback creation is skipped.
- The fallback remains manual-review-only and emits no public webhook by itself.

## Files

- `apps/job-worker/src/idempotency-ledger.ts`
- `apps/job-worker/src/idempotency-ledger.test.ts`
- `apps/job-worker/src/webhooks.ts`
- `apps/job-worker/src/webhooks.test.ts`
- `apps/job-worker/src/no-notification-fallback.ts`
- `apps/job-worker/src/index.ts`

## Tests

- Ledger claims once and skips duplicate processing.
- Stale processing claims can be reclaimed.
- Webhook worker skips duplicate delivery side effects for the same attempt.
- No-notification fallback tests continue to pass with ledger protection.

## Safety

- No public webhook type was added.
- No payment confirmation path was changed.
- The ledger wraps side effects only; it does not decide payment state.
