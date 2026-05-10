# Checkout Success / Failure Code Review Report

Date: 2026-05-10

## Objective

Review the current checkout, matching, backend contracts and worker behavior to find contradictions that could prevent:

- successful hosted checkout scenarios from reaching manual review safely;
- expected failure scenarios from failing cleanly;
- final-only webhook semantics from staying protected.

This review did not process real bank notifications and did not change `payment.confirmed` semantics.

## Multi-agent organization

- Orchestrator: coordinated scope, validation order and closeout.
- Backend checkout reviewer: inspected route selection, amount lease, readiness and checkout action contracts.
- Matching reviewer: inspected Payment Intent Gate, payable amount usage and receiver/sender bank separation.
- Web fallback reviewer: inspected hosted checkout structured errors and actionable fallback behavior.
- Worker/webhook reviewer: inspected no-notification fallback, review terminal events and idempotent webhook side effects.
- Final reviewer: challenged the patch for duplicate terminal events, stale final states and manual fallback semantics.

## Success scenario after correction

Expected successful path:

1. SDK creates an order only for a payment-ready merchant.
2. Checkout exposes only compatible active merchant receiving methods.
3. Buyer selects an available method.
4. Backend selects a compatible merchant receiving route.
5. Amount Lease allocates exact `payable_amount_minor`.
6. Expected Payment Profile stores `receiving_route_id`, receiver truth and sender truth separately.
7. `continue-to-bank` arms the receiver only for a compatible locked route.
8. A matching signal must match the exact payable amount, not only the displayed amount.
9. Strong match creates `needs_review` only.
10. Merchant manual confirmation is the only path to final public `payment.confirmed`.

## Failure scenarios after correction

- No active receiving route: checkout is unavailable before Step 1.
- Method not supported by merchant: backend returns structured conflict and web renders actionable fallback.
- Route disabled before lock: checkout can switch or show unavailable state.
- Route pending-disable after lock: existing session can continue.
- Route revoked after lock: `continue-to-bank` is blocked with fallback.
- Rounded displayed amount without exact payable amount: no strong review is created.
- Final order/session race: confirm/reject is blocked once either linked order or session is final.
- Duplicate same-scope rejection: returns idempotent result without publishing another terminal event.
- No-notification manual fallback rejection: remains `manual_bank_check`, not `notification_signal`.

## Contradictions found and fixed

1. Stale active amount leases could block new checkout allocation.
   - Fix: stale active leases for the same merchant/route/rail are expired before allocation.

2. Expired checkout mutation returned without a committed audit event.
   - Fix: expiration branch now commits the audit transition before returning.

3. Reallocated amount leases could leave a stale expected payment fingerprint.
   - Fix: route selection recomputes the fingerprint when the payable amount changes.

4. Matching still treated `display_amount_minor` as related.
   - Fix: Payment Intent Gate now treats exact `payable_amount_minor` as the matching amount. Display amount alone is not enough.

5. Receiver bank compatibility could be blurred by fallback identifiers.
   - Fix: matching candidate filtering now keeps receiver bank/profile separation strict.

6. Web fallback could collapse structured API conflicts into generic failure during intermediate POSTs.
   - Fix: hosted checkout preserves structured errors and renders actionable fallback actions.

7. Checkout actions could receive PAN/phone-like fields outside Step 1.
   - Fix: `continue-to-bank` and `claimed-paid` reject forbidden credential fields recursively.

8. Stale final order/session state could still allow review terminal actions.
   - Fix: review confirm/reject blocks when either linked payment session or order is already final.

9. No-notification fallback rejection was classified like a bank notification signal.
   - Fix: no-signal fallback rejection now uses `confirmation_type=manual_bank_check` internally.

10. Idempotent repeated rejection could republish another terminal event.
    - Fix: API skips metrics and event publication on idempotent terminal action results.

## Payable amount non-regression

Added regression coverage proving that a signal with only the rounded display amount does not create a strong review when the session expects a micro-reconciled payable amount.

Example protected case:

- `display_amount_minor = 139000`
- `payable_amount_minor = 139035`
- incoming signal amount = `139000`
- result: no review, no auto-confirmation, reason remains unrelated/no active payable match.

This protects the Amount Lease / micro-reconciliation model from being bypassed by the visible order price.

## Files changed

- `apps/api/src/orders.ts`
- `apps/api/src/orders.test.ts`
- `apps/api/src/payment-sessions.test.ts`
- `apps/api/src/reviews.ts`
- `apps/api/src/reviews.test.ts`
- `apps/api/src/server.ts`
- `apps/job-worker/src/consumers.ts`
- `apps/job-worker/src/consumers.test.ts`
- `apps/job-worker/src/index.ts`
- `apps/job-worker/src/webhook-runtime.ts`
- `apps/job-worker/src/webhook-runtime.test.ts`
- `apps/signal-worker/src/runtime.ts`
- `apps/signal-worker/src/runtime.test.ts`
- `apps/web/src/index.ts`
- `apps/web/src/checkout.test.ts`
- `apps/web/src/screens/CheckoutScreen.ts`
- `docs/10_MATCHING_AND_SCORING.md`
- `packages/matching-core/src/index.ts`
- `packages/matching-core/src/index.test.ts`
- `packages/matching-core/src/payment-intent-gate.test.ts`

## Tests added or strengthened

- Amount lease stale cleanup and fingerprint recalculation.
- Payment session expiry audit commit.
- Credential-field rejection outside Step 1.
- Display amount vs payable amount non-regression.
- Receiver bank/profile separation in matching.
- Runtime no-review behavior for rounded display amount.
- Structured hosted checkout fallback rendering.
- Review terminal stale-state guards.
- Idempotent rejection no-event behavior.
- Manual bank check rejection webhook guard.

## Validation

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` - 77 files, 649 tests passed
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `npm run test:replay`
- `npm run test:matching`
- `npm run test:privacy`
- `npm run test:webhooks`
- `git diff --check`

Android Gradle was not run because Android source was not touched.

## Remaining blockers

- Online SWIMVPN+ and staging hosted checkout will not show the local fixes until commit, push and Dokploy redeploy.
- Staging DB must have all recent migrations applied before validating the external app flow.
- Real bank notification testing remains blocked until explicit real-notification test authorization.

## Next recommended step

Commit and push these corrections, let staging redeploy, then run the external app -> SDK order -> hosted checkout smoke:

1. merchant card-only shows card only;
2. merchant SBP-only shows SBP only;
3. rounded display amount cannot create a review when payable amount differs;
4. exact payable amount can create manual review only;
5. final webhook fires only after merchant manual confirmation.
