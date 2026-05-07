# CR-2 Runtime Product Truth Inventory

generated_at: 2026-05-07T15:05:00+03:00

## Scope

Sprint CR-2 focused on the critical runtime contradictions found by the full code review:

- active signal runtime auto-confirm branch;
- signal runtime public webhook requests for review/signal activity;
- job-worker public webhook taxonomy;
- stale E2E/private-beta/five-bank fixtures that normalized review webhooks.

No real bank notifications were processed. No public production deployment was attempted.

## Inventory

| Area | Before CR-2 | CR-2 result |
| --- | --- | --- |
| `apps/signal-worker/src/runtime.ts` | Risky: `auto_confirmed` matching result called `autoConfirmSignal` and could request `payment.confirmed`. Review/reject paths requested public webhooks. | Active processor now routes trusted exact matches to manual review with `manual_confirmation_required_v1`. Review/reject paths no longer request public webhooks. |
| `apps/signal-worker/src/runtime.test.ts` | Tests expected public `payment.signal_detected`, `payment.needs_review` and runtime auto-confirm. | Tests now assert no public webhook before manual merchant confirmation and no auto-confirm counter increment. |
| `apps/job-worker/src/webhooks.ts` | Contradictory: public worker type allowed `payment.signal_detected`, `payment.needs_review`, `order.expired`. | Public event type is restricted to `payment.confirmed`, `payment.rejected`, `payment.expired`; unsupported event names fail closed. |
| `apps/job-worker/src/webhooks.test.ts` | Tests delivered internal review/signal webhooks. | Guardrails reject internal event names and ignore endpoints subscribed only to internal names. |
| `tests/durable-worker-e2e.test.ts` | Expected runtime `auto_confirmed` and review webhooks. | Expects manual review, then a signed `payment.confirmed` only from a manual-confirmation event. |
| `tests/private-beta-review-webhook-rehearsal.test.ts` | Expected `payment.needs_review` public delivery. | Expects internal review events only and final public event subscription list. |
| `tests/psp-like-checkout-flow.test.ts` | Expected public signal/review webhooks. | Expects internal review events and manual `payment.confirmed` only after merchant confirmation. |
| `tests/e2e-payment-signal-flow.test.ts` | Used `payment.needs_review` endpoint subscription and reused matching decision as public webhook decision. | Public endpoint list is final-only; webhook decision is `manual_confirmed`. |
| `packages/bank-templates/five-bank-synthetic-shadow-fixtures.json` | Stale `expected_webhook_type` fields implied public review/reject webhooks for synthetic shadow fixtures. | Fixtures now use `expected_public_webhook_type: null`; tests assert no stale `expected_webhook_type`. |
| `apps/api/src/admin.test.ts` | Admin sample failure event used `payment.needs_review`. | Sample now uses a public terminal event. |

## Remaining Legacy / Deferred Cleanup

- `packages/matching-core` still exposes `auto_confirmed` as a deterministic matching-library decision for older/future policy tests. CR-2 keeps runtime V1 safe by forcing the active processor to manual review.
- `SignalRuntimeRepository` implementations still include dormant `autoConfirm` and `requestWebhookDelivery` methods. They are not called by `SignalRuntimeProcessor` after CR-2, but should be removed or isolated in a later cleanup sprint.
- Historical `.swimpay-agent` reports and older docs still mention prior product assumptions as historical records. Active code/tests now guard final V1 semantics.

