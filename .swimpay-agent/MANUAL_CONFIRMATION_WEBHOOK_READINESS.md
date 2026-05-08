# Manual Confirmation / Webhook Readiness

Date: 2026-05-08

No real notifications were processed.

## Result

Status: ready with external staging proof pending.

Manual review confirmation API and public webhook worker have test coverage. External app staging delivery remains to be proven.

## Evidence

- `apps/api/src/reviews.ts`
- `apps/api/src/reviews.test.ts`
- `apps/job-worker/src/webhooks.ts`
- `apps/job-worker/src/webhooks.test.ts`
- `packages/swimpay-node/src/webhooks.ts`
- `packages/swimpay-node/src/index.test.ts`
- `tests/private-beta-review-webhook-rehearsal.test.ts`
- `tests/durable-worker-e2e.test.ts`

## Checks

| Check | Status | Notes |
| --- | --- | --- |
| payment.confirmed only after manual confirmation | ready | Review and webhook tests model manual confirmed decision only. |
| payment.rejected after manual rejection | ready | Review/webhook rejection paths covered. |
| payment.expired after expiration | ready | Webhook worker handles `payment.expired`; full staging expiry proof pending. |
| No public signal_detected/needs_review fulfillment | ready | Worker and SDK reject internal event names. |
| Webhook signature | ready | HMAC signature tests exist. |
| External app fulfillment only after verified payment.confirmed | ready synthetic | External app test exists; live staging delivery pending. |

## Missing Proof

External staging app receives and verifies `payment.confirmed` after manual confirmation only.

