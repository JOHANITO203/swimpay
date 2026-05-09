# PAN Sensitive Boundary Report

generated_at: 2026-05-09T23:10:00+03:00

Status: strengthened.

PAN intake remains allowed only in hosted checkout Step 1 through Expected Payment Profile creation. The existing path derives:

- `sender_card_last4`;
- `sender_card_masked`;
- `sender_card_hmac`.

No raw PAN is stored by the Expected Payment Profile migration or returned by checkout status responses.

New guardrails added:

- Fastify redaction paths now include `sender_card_number`, `buyer_source_card_number`, `card_number`, `cardNumber`, `cardPan`, `full_card`, `pan`, `cvv`, `expiry`, `pin`, `sms_code`.
- Structured observability redaction now handles PAN/card/credential keys and key-value diagnostic text.
- Receiver signal contract rejects camelCase and snake_case raw card markers.
- Public webhook worker rejects `pan`, `cardPan`, `full_card`, `cvv`, `expiry`, `pin`, `sms_code`.
- Node SDK order creation rejects PAN/card credential fields recursively outside hosted checkout Step 1.
- Node SDK webhook parser rejects unsafe public event fields.

Tests:

- `packages/security/src/index.test.ts`
- `packages/observability/src/index.test.ts`
- `packages/contracts/src/android-receiver.test.ts`
- `apps/api/src/signals.test.ts`
- `apps/job-worker/src/webhooks.test.ts`
- `packages/swimpay-node/src/index.test.ts`

Remaining: browser/server access logs in staging should be observed after deploy to confirm no body logging plugin bypasses these redaction settings.
