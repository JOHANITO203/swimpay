# Task 028 Report: Review Rejection Semantics

generated_at: 2026-05-02T16:40:00+03:00

## Status

Completed.

Local commit:

- `ed6b5bd task 028: review rejection semantics`

Branch:

- `agent-autonomous-run`

## Objective

Clarify and implement safe review rejection semantics so rejecting a manual review no longer rejects the linked order by default.

The task focused only on `028_review_rejection_semantics`. No Phase 2 task after 028 was implemented.

## Final Semantics

`POST /v1/reviews/:id/reject` now supports explicit rejection scopes:

- `signal`
- `payment_session`
- `order`

Default scope:

- `signal`

### Scope: `signal`

Behavior:

- `review.status = rejected`
- linked signal status becomes `rejected` when available
- linked order remains unchanged
- linked payment session remains unchanged
- redacted audit events are written
- internal `review.rejected` event is published
- no public `payment.rejected` webhook is created by default

This is now the default behavior.

### Scope: `payment_session`

Behavior:

- `review.status = rejected`
- linked signal status becomes `rejected` when available
- linked payment session becomes `rejected`
- linked order remains unchanged
- redacted audit events are written
- internal review rejection event is published

### Scope: `order`

Behavior:

- `review.status = rejected`
- linked signal status becomes `rejected` when available
- linked order becomes `rejected`
- linked payment session becomes `rejected` when linked
- redacted audit events are written
- internal review rejection event is published

This is explicit only. It is no longer the default review rejection path.

## API Behavior

Endpoint:

```http
POST /v1/reviews/:id/reject
```

Example request:

```json
{
  "scope": "signal",
  "reason": "false_positive"
}
```

If `scope` is omitted, the API uses:

```json
{
  "scope": "signal"
}
```

Supported reason codes:

- `false_positive`
- `wrong_signal`
- `amount_collision`
- `negative_direction`
- `buyer_not_recognized`
- `expired_payment`
- `fraud_suspected`
- `merchant_cancelled`
- `other`

Invalid scopes or reasons return `400`.

Conflicting scope escalation after an already rejected review returns `409 review_rejection_scope_conflict`.

## Idempotency

Same-scope duplicate rejection is idempotent-safe.

Repeated request:

```json
{
  "scope": "signal",
  "reason": "false_positive"
}
```

Expected behavior:

- no duplicate review action effects
- no duplicate audit effects where avoidable
- response marks the action as idempotent

Conflicting retry example:

1. First reject with `scope = signal`
2. Later reject same review with `scope = order`

Expected result:

- `409 review_rejection_scope_conflict`

## Events

Added or aligned internal event constants:

- `review.rejected`
- `signal.rejected`
- `payment_session.rejected`
- `order.rejected`

No unrelated event names were added.

## Audit Events

The implementation writes redacted audit events for:

- `review.rejected`
- `review.action_created`
- `signal.rejected`
- `payment_session.status_changed` when payment-session scope is used
- `order.status_changed` when order scope is used

Audit payloads avoid raw phone numbers and raw notification text.

## Webhook Behavior

Signal-scope review rejection does not create a public `payment.rejected` webhook by default.

This avoids turning a false-positive signal rejection into a merchant-visible payment/order rejection.

If future product policy exposes public rejection webhooks for explicit order/session rejection, payloads must keep:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

## Database Changes

Added migration:

- `packages/database/migrations/003_review_rejection_semantics.sql`

Schema updates:

- `review_actions.scope TEXT`
- check constraint allowing only:
  - `signal`
  - `payment_session`
  - `order`
- index:
  - `idx_review_actions_review_action`

The migration is additive and idempotent-safe for the constraint.

## Tests Added

Updated:

- `apps/api/src/reviews.test.ts`

Coverage added:

- default reject without scope rejects review/signal only
- order remains pending/active after default signal rejection
- payment session remains active after default signal rejection
- explicit `payment_session` scope rejects only the linked session
- explicit `order` scope rejects order and linked session
- duplicate same-scope rejection is idempotent-safe
- conflicting scope escalation returns a clear conflict
- invalid scope is rejected
- invalid reason is rejected
- review responses do not expose raw PII

Existing safety regressions remained covered:

- no amount-only auto-confirm regression
- unsafe signal directions remain blocked by previous runtime tests
- no official bank confirmation wording introduced

## Documentation Updated

Created:

- `docs/REVIEW_REJECTION_SEMANTICS.md`
- `docs/REVIEW_QUEUE.md`

Updated:

- `docs/05_DATABASE_SCHEMA.md`
- `docs/06_API_SPEC.md`
- `docs/07_EVENT_CATALOG.md`
- `docs/12_WEBHOOKS.md`
- `docs/24_ORDER_AND_SESSION_STATE_MACHINES.md`
- `docs/IMPLEMENTATION_NOTES.md`
- `docs/SIGNAL_RUNTIME_PIPELINE.md`
- `.swimpay-agent/CURRENT_TASK.md`
- `.swimpay-agent/NEXT_ACTION.md`
- `.swimpay-agent/PHASE_2_RUNTIME_PLAN.md`
- `.swimpay-agent/PROGRESS_LOG.md`
- `.swimpay-agent/TASK_QUEUE.md`

## Validation Results

Final validation passed:

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS
- `git diff --check`: PASS

Test suite result:

- 27 test files passed
- 164 tests passed

## Security And Privacy Review

Confirmed:

- no raw phone exposure in review responses
- no raw notification text exposure in review responses
- no public official bank confirmation claim
- no PSP/SBP behavior added
- no Android payment decision logic added
- no payment auto-confirm behavior changed
- no amount-only auto-confirm behavior added
- no bank package/certificate trust behavior changed

## Intentionally Not Implemented

Not included in this task:

- task `029_durable_worker_e2e_tests`
- public webhook policy for explicit order/session rejection
- Android Receiver app logic
- production deployment
- new bank package or certificate verification
- PSP behavior
- SBP behavior
- official bank confirmation behavior
- broad matching or parser changes

## Next Recommended Task

Next task:

- `029_durable_worker_e2e_tests`

Goal:

- add durable end-to-end tests across API, signal runtime, review semantics, webhook delivery, and worker boundaries without using external production services.
