# Runtime Payment Intent Source Truth Audit

Date: 2026-05-08

## Result

Active runtime is aligned with V1 product truth.

## Verified

- SwimPay is payment-intent-bound.
- No active payment intent creates no merchant payment review.
- Background bank activity creates no review.
- Unknown shape alone creates no review.
- Feedback alone creates no review.
- `receiver_armed` does not confirm payment.
- `buyer_claimed_paid` / `J'ai paye` does not confirm payment.
- Strong match creates manual review only.
- `Matching 100 %` is merchant review copy only.
- Negative categories are rejected/ignored.
- Collisions route to caution/manual review.
- No active `payment.confirmed` before merchant manual confirmation.

## Search Classification

- Active dangerous path: none found in runtime/matching/payment-session flow.
- Inactive compatibility vocabulary: `auto_confirm*` remains in schema/template/profile compatibility and historical context.
- Stale docs: historical reports and some bank-template learning docs use older terms.
- Safe test fixture: bank-template/parser fixtures can carry old candidate vocabulary but do not confirm payments.
- Must rename later: admin/operator template vocabulary still exposes auto-confirm language.

## Evidence

- `apps/signal-worker/src/runtime.ts`
- `packages/matching-core/src/index.ts`
- `apps/api/src/reviews.ts`
- `apps/api/src/server.ts`
- `tests/product-truth-runtime-neutralization.test.ts`

