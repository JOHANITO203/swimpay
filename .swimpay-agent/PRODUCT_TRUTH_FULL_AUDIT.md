# Product Truth Full Audit

generated_at: 2026-05-07T14:40:00+03:00

## Verdict

Product truth is documented correctly in newer files (`docs/12_WEBHOOKS.md`, `docs/SIGNAL_RUNTIME_PIPELINE.md`, SDK docs), but the runtime and some older docs/tests still contradict the final V1 truth.

## Blocking contradictions

| Severity | File | Evidence | Risk | Required before real-world testing |
| --- | --- | --- | --- | --- |
| Critical | `packages/matching-core/src/index.ts:21`, `:277`, `:286`, `:477` | `MatchingDecision` includes `auto_confirmed`; `evaluateSignalMatch` can return it. | A real signal path can still auto-confirm if trusted conditions are met. | Yes |
| Critical | `apps/signal-worker/src/runtime.ts:296`, `:338`, `:389` | `autoConfirmSignal` updates through repository and requests `payment.confirmed`. | Direct conflict with manual-confirm-only V1. | Yes |
| Critical | `apps/signal-worker/src/runtime.ts:92`, `:433`, `:459` | Runtime type and review path request `payment.signal_detected` and `payment.needs_review`. | Internal review/signal events can enter webhook delivery pipeline. | Yes |
| Critical | `apps/job-worker/src/webhooks.ts:9-14` | `PublicWebhookEventType` includes `payment.signal_detected`, `payment.needs_review`, and `order.expired`. | Public webhook taxonomy conflicts with SDK/public docs. | Yes |
| Critical | `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverBoundaries.kt:17-19` | Real bank packages are not accepted; only debug app package is accepted. | Real supported bank capture cannot work honestly yet. | Yes |

## High-risk stale assumptions

- `docs/24_ORDER_AND_SESSION_STATE_MACHINES.md` still shows a normal flow to `auto_confirmed`.
- `docs/05_DATABASE_SCHEMA.md` still documents `auto_confirmed` indexes and merchant auto-confirm fields without V1 future-gating.
- `README.md` and `docs/LOCAL_DEVELOPMENT.md` contain older wording around a decision engine that auto-confirms/reviews/rejects.
- Several older tests/fixtures still use `payment.needs_review` as a webhook event. Some may be legacy/private beta tests, but they now conflict with the final public V1 contract.

## Safe/aligned findings

- `packages/swimpay-node/src/webhooks.ts` accepts only `payment.confirmed`, `payment.rejected`, and `payment.expired`.
- SDK docs explicitly state `payment.confirmed` fires only after merchant manual confirmation.
- Public webhook disclosure fields use `official_bank_confirmation=false` in current public docs and SDK parser.
- Android source has explicit boundaries that Android does not confirm payments or send webhooks.

## Recommendation

Run a short product-truth enforcement sprint before real-world testing:

1. Disable/remove runtime auto-confirm path from `apps/signal-worker` and legacy matching entrypoint.
2. Split internal runtime events from public webhook delivery event types.
3. Future-gate `auto_confirmed` schema/docs as non-V1 dormant state or remove from active V1 flows.
4. Add guardrail tests against `SignalRuntimeProcessor` emitting public internal review/signal webhooks.

