# Task 029 Report: Durable Worker E2E Tests

generated_at: 2026-05-02T17:05:00+03:00

## Status

Completed.

Local commit:

- `c9177e6 task 029: durable worker e2e tests`

Branch:

- `agent-autonomous-run`

## Objective

Add durable end-to-end stabilization tests across API, signal runtime, review semantics, webhook delivery and worker boundaries.

This task was test and documentation focused. No new product feature was implemented.

## Scope

Implemented only:

- `029_durable_worker_e2e_tests`

Did not implement:

- `030_runtime_observability`
- Android Receiver app logic
- production deployment
- real bank package/cert verification
- PSP behavior
- SBP behavior
- SMS reading
- bank app scraping
- official bank confirmation behavior
- broad parser or matching changes

## Files Changed

Created:

- `tests/durable-worker-e2e.test.ts`
- `docs/DURABLE_WORKER_E2E_TESTS.md`

Updated:

- `docs/IMPLEMENTATION_NOTES.md`
- `docs/LOCAL_DEVELOPMENT.md`
- `.swimpay-agent/CURRENT_TASK.md`
- `.swimpay-agent/TASK_QUEUE.md`
- `.swimpay-agent/PROGRESS_LOG.md`
- `.swimpay-agent/NEXT_ACTION.md`
- `.swimpay-agent/PHASE_2_RUNTIME_PLAN.md`
- `.swimpay-agent/BLOCKERS.md`

## Test Harness

The new suite is an in-process E2E harness.

It exercises real application modules where it matters:

- API route handlers
- receiver signal ingestion validation
- signal runtime processor
- JetStream consumer wrapper behavior
- review rejection endpoint behavior
- webhook delivery worker
- webhook runtime handler

It uses local fakes for infrastructure:

- order repository
- receiver signal repository
- review repository
- event publisher
- webhook repository
- webhook HTTP client

No external network service is called.

Live NATS and live PostgreSQL are not required for this suite.

## E2E Flows Covered

### 1. API-created untrusted bank signal routes to review

Coverage:

- creates order through API
- creates payment session through API
- ingests synthetic signed notification signal
- converts emitted `signal.received` event into internal worker envelope
- processes it through the signal-worker handler
- verifies no auto-confirm
- verifies review creation
- verifies reason codes include untrusted bank/app metadata
- verifies order is not auto-confirmed
- verifies `official_bank_confirmation` is false

### 2. Amount-only signal never auto-confirms

Coverage:

- exact amount
- matching active session
- missing phone and reference identity
- decision routes to review
- reason includes `amount_only_never_auto_confirm`
- order remains not confirmed

### 3. Unsafe categories never auto-confirm

Covered synthetic categories:

- cashback
- refund
- outgoing payment
- promo
- failed transfer
- unknown direction

Expected behavior:

- no auto-confirmation
- no `payment.confirmed` webhook
- review or reject according to current runtime semantics
- audit events exist
- order is not confirmed

### 4. Trusted synthetic auto-confirm happy path

Coverage:

- synthetic trusted bank profile
- verified synthetic package/cert status
- trusted template status
- trusted synthetic device
- exact amount
- phone/reference identity match
- no collision
- active payment session
- pending order

Expected behavior:

- `decision.auto_confirmed`
- order becomes `auto_confirmed`
- payment session becomes `auto_confirmed`
- webhook event created
- webhook payload includes:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

### 5. Collision creates review

Coverage:

- two active sessions
- same merchant
- same amount
- missing strong phone/reference disambiguation

Expected behavior:

- no auto-confirm
- collision detected
- review created
- reason includes `amount_collision`

### 6. Duplicate signal is idempotent

Coverage:

- repeated signal runtime processing
- duplicate API event id ingestion

Expected behavior:

- no duplicate review
- no duplicate webhook event
- no duplicate match
- API duplicate event id returns conflict

### 7. Review rejection semantics

Default signal-scope rejection:

- review rejected
- linked signal rejected
- order unchanged
- payment session unchanged
- no public `payment.rejected` webhook by default

Explicit order-scope rejection:

- review rejected
- linked signal rejected
- order rejected
- linked session rejected
- audit events written

### 8. Webhook delivery loop

Success path:

- creates webhook delivery
- sends signed POST through mocked HTTP client
- verifies headers:
  - `SwimPay-Event-Id`
  - `SwimPay-Delivery-Id`
  - `SwimPay-Timestamp`
  - `SwimPay-Signature`
- marks delivery as `delivered`

Failure path:

- mocked non-2xx responses
- retry is scheduled
- attempt count increments
- exhausted attempts become `dead`

### 9. Worker boundary checks

Coverage:

- signal-worker handler invoked through `processJetStreamMessage`
- invalid `signal.received` data nacks and rethrows
- invalid PII-bearing webhook envelope terms and rethrows
- errors are not silently swallowed

## Privacy And Safety Assertions

The E2E suite asserts tested payloads do not expose:

- raw buyer phone
- normalized raw phone
- raw notification text
- raw API keys
- `official_bank_confirmation: true`
- `bank_confirmed`
- `guaranteed_payment`
- `psp_confirmed`

The suite also verifies payment webhooks use:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

## TDD Evidence

Targeted test run:

```bash
npm test -- --run tests/durable-worker-e2e.test.ts
```

Initial result:

- failed on expected error-message mismatch for invalid worker envelope handling

Correction:

- adjusted the assertion to match existing JetStream wrapper behavior:
  - `Invalid JetStream event payload: raw_pii_field_present`

Final targeted result:

- 7 tests passed

## Validation Results

Final validation passed:

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS
- `git diff --check`: PASS

Full test suite:

- 28 test files passed
- 171 tests passed

## Known Limitations

This task intentionally does not provide live infrastructure integration tests.

Still future work:

- live NATS JetStream integration tests
- live PostgreSQL migration/runtime integration tests
- full worker process orchestration tests
- Android Receiver platform tests
- production observability and runtime metrics

These are better aligned with task `030_runtime_observability` and later deployment/integration hardening.

## Security Review

Confirmed:

- no raw phone storage behavior added
- no raw notification storage behavior added
- no raw PII exposure added
- no official bank confirmation behavior added
- no PSP/SBP behavior added
- no SMS reading added
- no bank app scraping added
- no LLM payment decision path added
- no auto-confirmation gate was weakened
- `TO_VERIFY`/untrusted bank app metadata still cannot auto-confirm

## Final Result

Task 029 is complete.

The repository now has a durable local E2E safety net for the Phase 2 runtime foundation.

## Next Recommended Task

Next task:

- `030_runtime_observability`

Recommended focus:

- lightweight structured runtime observability
- safe metrics/logging for API and workers
- no raw PII in logs
- no heavyweight monitoring stack for the 2 GB single-server V1 target
