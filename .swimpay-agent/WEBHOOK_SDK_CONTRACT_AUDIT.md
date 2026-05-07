# Webhook and SDK Contract Audit

generated_at: 2026-05-07T14:40:00+03:00

## Verdict

The public SDK packages are much cleaner than the internal webhook worker. The main risk is a split-brain contract: `@swimpay/node` accepts only final V1 events, while `apps/job-worker` still models old internal events as `PublicWebhookEventType`.

## SDK Web

Status: production-oriented.

- `packages/swimpay-node/src/orders.ts` rejects unsafe create-order fields such as auto-confirm, CVV, expiry and raw card/source card fields.
- `packages/swimpay-node/src/webhooks.ts` verifies raw-body HMAC, timestamp and event ID.
- Public SDK parser accepts only:
  - `payment.confirmed`
  - `payment.rejected`
  - `payment.expired`
- Parser rejects `officialBankConfirmation !== false`.
- SDK errors sanitize secret/API-key/raw/phone/card fields.

## Android Merchant SDK

Status: production-oriented helper, publication pending.

- Separate from Receiver package.
- Does not contain NotificationListener, webhook handling or secret-key logic.
- Docs tell merchants to call their backend and refresh status after return.

## Blocking webhook risk

| Severity | File | Evidence | Risk |
| --- | --- | --- | --- |
| Critical | `apps/job-worker/src/webhooks.ts:9-14` | Worker `PublicWebhookEventType` includes `payment.signal_detected`, `payment.needs_review`, `order.expired`. | Internal events can be treated as public delivery events. |
| Critical | `apps/signal-worker/src/runtime.ts:433`, `:459` | Runtime requests delivery for `payment.signal_detected` and `payment.needs_review`. | Fulfillment/event contract can diverge from SDK docs. |
| High | `packages/bank-templates/five-bank-synthetic-shadow-fixtures.json` | Fixtures still expect `payment.needs_review` for some cases. | Stale test fixtures can normalize wrong public event semantics. |

## Developer Integration Wizard

Status: visually and backend-lifecycle partially ready, but web BFF/auth wiring incomplete.

- Snippets are safe in intent.
- Normal credential reads mask secrets.
- One-time secret reveal exists after rotate/create.
- Web route forms do not yet include BFF CSRF token handling in the web server.

## Recommendation

1. Rename worker type to `WebhookEventType` and restrict public merchant webhooks to final V1 events.
2. Move `payment.signal_detected` / `payment.needs_review` to internal event/audit only.
3. Add worker guardrail tests that reject internal event types at delivery creation.
4. Align fixtures and old tests to the public-vs-internal split.

