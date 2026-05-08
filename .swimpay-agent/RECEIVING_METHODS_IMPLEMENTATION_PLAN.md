# Receiving Methods Implementation Plan

Date: 2026-05-08

## Objective

Implement merchant receiving methods as a real business primitive, not a UI-only onboarding step.

The merchant must be able to persist where money can be received:

- card receiving method;
- phone receiving method;
- associated supported bank;
- active/inactive/default state;
- masked display for UI and checkout;
- HMAC/last4 for deduplication and matching context.

## Existing Audit

Ready:

- Existing storage model `merchant_receiving_routes` already linked destinations to `merchant_id`, bank, rail type and checkout selection.
- Existing checkout already requires receiver bank and receiving route selection before payer launcher/instructions.
- Android premium UI already had receiving-method screens and onboarding step, but needed stronger product API wiring.
- Web merchant page already existed at `/merchant/receiving-methods`, but used legacy route vocabulary.

Needed work:

- Product-facing API alias `/v1/merchant/receiving-methods`.
- Server-side validation for card/phone values and forbidden credential fields.
- HMAC/last4 persisted for dedupe/matching without raw exposure.
- Android create/list/disable/default wired to product endpoints.
- Android form clear only after backend success.
- Web merchant write adapter moved from legacy route API to product method API.

## Implementation Order

1. Add backend and Android contract tests.
2. Extend schema additively with HMAC and last4.
3. Add product receiving-method API aliases over the existing route repository.
4. Add server validation and safe response mapping.
5. Wire Android onboarding and menu receiving-method screen to product API.
6. Wire web merchant surface to product API while keeping internal route compatibility.
7. Confirm checkout still consumes only active receiving routes/methods.
8. Update docs and reports.

## Guardrails

- No raw card/phone returned after creation.
- No CVV, expiry, PIN, SMS code or bank credential accepted.
- No payment confirmation behavior changed.
- Android still cannot confirm orders and does not send developer webhooks.
- Phone SBP wording remains copy only, not SBP integration.
