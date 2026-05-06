# SDK Web Package Inventory

generated_at: 2026-05-06T00:00:00+03:00

## Scope

Sprint 9B audits and implements a minimal production-safe Web/Node SDK for merchant backends.

Out of scope:

- Android SDK;
- Developer Integration Wizard UI;
- payment runtime behavior changes;
- Android notification processing;
- auto-confirmation;
- public signal/review fulfillment webhooks.

## Current Repository Conventions

- Root workspace includes `packages/*`, so the SDK should live under `packages/swimpay-node`.
- Existing packages use:
  - `package.json` with ESM exports;
  - `src/index.ts`;
  - `tsconfig.json` extending `../../tsconfig.base.json`;
  - package references from root `tsconfig.json`.
- Root scripts use `tsc -b`, `eslint .`, and `vitest run`.

## Existing Primitives

### Order Creation

- Public API docs define `POST /v1/orders`.
- API examples now require merchant backend usage.
- Buyer/browser/Android clients must not contain merchant secret keys.
- Current SDK gap: no packaged merchant helper exists.

### Webhook Signing

Existing worker helper:

```text
SwimPay-Signature = sha256=HMAC_SHA256(webhook_secret, SwimPay-Timestamp + "." + raw_payload)
```

Required headers:

- `SwimPay-Event-Id`
- `SwimPay-Timestamp`
- `SwimPay-Signature`

Current SDK gap: no merchant-facing raw-body verifier exists.

### Public Webhook Events

Final V1 SDK-facing public events:

- `payment.confirmed`
- `payment.rejected`
- `payment.expired`

Internal concepts remain non-fulfillment and must not be exposed by SDK examples as order-release triggers:

- signal detected;
- needs review;
- matching;
- feedback;
- unknown shape.

## Package Decision

Create:

```text
packages/swimpay-node
```

Package name:

```text
@swimpay/node
```

Rationale:

- follows existing `packages/*` workspace convention;
- separates merchant SDK types from internal server/database models;
- avoids depending on internal worker/runtime packages;
- keeps a stable public API surface.

## Planned Public API

- `new SwimPay({ secretKey, apiBaseUrl })`
- `swimpay.orders.create(input, options)`
- `swimpay.webhooks.verify(rawBody, headers, webhookSecret)`
- public webhook event types for V1 terminal/post-review events only
- typed SDK errors

## Safety Requirements

- No `auto_confirm` / `autoConfirm` in SDK inputs.
- No raw card, CVV, expiry, raw phone or raw notification text in SDK payloads/events/errors.
- No public `payment.signal_detected` or `payment.needs_review` fulfillment event parsing.
- `officialBankConfirmation` must always be false in public webhook events.
- Docs/examples must keep secret keys server-side only.
