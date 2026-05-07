# Payment Intent and Review Flow Audit

generated_at: 2026-05-07T14:40:00+03:00

## Verdict

The checkout path and Payment Intent Gate model exist, but the durable `SignalRuntimeProcessor` is not yet fully realigned to use the Payment Intent Gate as the active review gate. This is the biggest payment-flow blocker.

## Aligned pieces

- Checkout has non-confirming actions for receiver arming and claimed paid:
  - API: `apps/api/src/server.ts:1292` (`continue-to-bank`)
  - API: `apps/api/src/server.ts:1300` (`claimed-paid`, HTTP 202)
  - Web: `apps/web/src/index.ts:657`, `:662`
- `packages/matching-core/src/index.ts:524` implements `evaluatePaymentIntentGate`.
- Payment Intent Gate decisions set `autoConfirmAllowed: false` (`packages/matching-core/src/index.ts:692`).
- Buyer recognition hints reject CVV/expiry/PIN/SMS/password in contract helpers.

## Blocking issues

| Severity | File | Evidence | Risk |
| --- | --- | --- | --- |
| Critical | `apps/signal-worker/src/runtime.ts:296`, `:338-389` | Active runtime can run `autoConfirmSignal`. | `payment.confirmed` can be emitted without merchant manual confirmation under legacy trust conditions. |
| Critical | `apps/signal-worker/src/runtime.ts:433`, `:459` | Review creation requests `payment.signal_detected` and `payment.needs_review` webhook requests. | Public webhook semantics can be violated. |
| High | `apps/signal-worker/src/runtime.ts` | Runtime uses `evaluateSignalMatch`, not the final `evaluatePaymentIntentGate` output. | Payment-intent-bound rule is not the sole active gate. |
| High | `packages/matching-core/src/index.ts:21-286` | Legacy matching path can return `auto_confirmed`. | Conflicts with V1 manual-only final product truth. |

## Review actions

Manual confirm/reject endpoints are present (`apps/api/src/server.ts:1785`, `:1843`) and publish review action events. The issue is not manual review itself; the issue is legacy signal runtime paths that can create public/internal webhook events before manual review.

## Recommendation

1. Refactor `SignalRuntimeProcessor` to call `evaluatePaymentIntentGate` after classification.
2. Remove/disable `autoConfirmSignal` from V1 runtime.
3. Make review creation only create a backend review/audit/internal event, not public webhook delivery.
4. Add tests:
   - no active intent -> no review and no webhook;
   - expected candidate -> review only;
   - Matching 100 % -> review only;
   - manual confirm only -> `payment.confirmed`;
   - claimed paid and receiver armed never confirm.

