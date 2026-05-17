# Payment Expired Webhook Wiring Report

generated_at: 2026-05-17

## Decision

The checkout and SDK audit findings stay accepted as-is for now, except the webhook expiry gap.

Implemented:

- internal `payment_session.expired` -> public `payment.expired`;
- internal `order.expired` -> public `payment.expired`;
- job-worker runtime routing for both expiry consumers.

## Files Changed

- `apps/job-worker/src/webhook-runtime.ts`
- `apps/job-worker/src/webhook-runtime.test.ts`
- `apps/job-worker/src/index.ts`
- `apps/job-worker/src/index.test.ts`

## Runtime Behavior

When the job-worker receives `order.expired` or `payment_session.expired`, it now enqueues a public webhook event:

- `type`: `payment.expired`
- `status`: `expired`
- `decision`: `expired`
- `confirmation_type`: `notification_signal`
- `official_bank_confirmation`: `false`

The payload keeps the existing public payment identifiers:

- `order_id`
- `external_id` when present
- `payment_session_id`
- `amount_minor`
- `currency`
- optional `reason_label`

## Preserved Boundaries

- No checkout behavior changed.
- No SDK behavior changed.
- No Android behavior changed.
- No auto-confirmation added.
- No official bank confirmation claim added.
- Existing `payment.confirmed` and `payment.rejected` manual-review webhook paths were left unchanged.

## Tests Added

- `payment_session.expired` handler enqueues a terminal `payment.expired` event.
- job-worker runtime routes the expiry consumer to the new public webhook handler instead of the safe stub.

## Verification

Passed:

```bash
npm test -- apps/job-worker/src/index.test.ts apps/job-worker/src/webhook-runtime.test.ts
npm test -- apps/job-worker/src/index.test.ts apps/job-worker/src/webhook-runtime.test.ts apps/job-worker/src/webhooks.test.ts packages/swimpay-node/src/index.test.ts apps/api/src/payment-sessions.test.ts apps/web/src/checkout.test.ts
npm run typecheck
```

Result:

- focused red/green pass: 2 test files, 12 tests.
- targeted checkout/webhook/SDK pass: 6 test files, 163 tests.
- TypeScript project build passed.
