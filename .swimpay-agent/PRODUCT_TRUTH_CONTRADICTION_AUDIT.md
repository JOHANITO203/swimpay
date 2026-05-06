# Product Truth Contradiction Audit

generated_at: 2026-05-06

## Final Truth Checked

- SwimPay is payment-intent-bound.
- No active payment intent means no merchant payment review.
- `Continuer vers ma banque` arms the receiver.
- `J'ai paye` never confirms payment.
- Matching 100 % is review copy only.
- Merchant manual confirmation is required in V1.
- Webhook fires only after merchant confirmation.
- Android never confirms orders and never sends developer webhooks.
- SDK Android never contains the secret key.
- No official bank confirmation claim.
- No auto-confirmation V1.
- No SMS, Accessibility, broad app enumeration, raw notification storage, raw PII in webhook/UI/logs.

## High-priority Contradictions

1. `docs/12_WEBHOOKS.md`
   - Contains public-looking `payment.signal_detected` and `payment.needs_review` webhooks.
   - Contains a `payment.confirmed` example with `decision: auto_confirmed`.
   - Conflicts with final public webhook direction if fulfillment webhooks must fire only after merchant manual confirmation.

2. `docs/06_API_SPEC.md`
   - Order example includes `"auto_confirm": true`.
   - Buyer fields are outdated compared with current recognition hints.
   - Session example starts in `receiver_arming`, which can imply arming at order creation rather than on `Continuer vers ma banque`.

3. Legacy auto-confirm docs
   - `docs/00_PROJECT_OVERVIEW.md`, `docs/01_PRODUCT_REQUIREMENTS.md`, `docs/10_MATCHING_AND_SCORING.md`, `docs/17_OPERATIONS_RUNBOOK.md`, `docs/20_OBSERVABILITY_AND_METRICS.md`, `docs/24_ORDER_AND_SESSION_STATE_MACHINES.md` still describe auto-confirm as a V1 or operational path.
   - Some of this can remain future architecture only if explicitly labeled as disabled/out-of-scope for current V1.

4. Tests around auto-confirm paths
   - E2E/durable tests still include synthetic/trusted auto-confirm behavior.
   - Current final product says no auto-confirmation V1. These tests should either be future-gated or rewritten for manual-confirm-only V1.

5. Bank templates and observability
   - Template metadata contains `allow_auto_confirm_candidate` and auto-confirm policy fields.
   - Observability includes `signals_auto_confirmed_total`.
   - These should be clearly future-only or disabled in V1.

## Medium-priority Contradictions

- Some Android/debug/operator messages mention "auto-confirm" in safe disclaimers. This is acceptable in debug/operator tooling but should stay out of merchant-facing UI.
- Developer docs mention `payment.needs_review` as an event merchants may receive. Final V1 should clarify whether this is internal only or a non-fulfillment developer notification.
- Some docs still say "validation" while the latest merchant language moved toward "confirmation". This is copy debt, not core logic risk.

## Aligned Areas

- Checkout has `continue-to-bank` and `claimed-paid` routes.
- Contracts/tests state `buyer_claimed_paid` is not confirming.
- Payment Intent Gate returns unrelated/no review when no active intent exists.
- Signal worker includes `no_active_payment_intent_no_review`.
- Webhook contract examples generally keep `official_bank_confirmation=false`.
- Android source does not add SMS, Accessibility or broad app enumeration.

## Recommendation

Before SDK docs are published, run a docs/contracts cleanup sprint that separates:

- public merchant webhooks;
- internal events;
- future disabled auto-confirm architecture;
- V1 manual-confirm-only behavior.

