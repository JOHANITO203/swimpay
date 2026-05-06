# Developer Wizard Inventory

generated_at: 2026-05-06T00:00:00+03:00

Sprint: 9D - Developer Integration Wizard Production Readiness

## Current UI Surfaces

Existing web merchant routes:

- `/merchant/connected-site`
- `/merchant/settings`

Current connected-site UI is merchant-friendly but static. It shows webhook status, actions and recent deliveries, but it does not yet provide a production integration wizard with Web/Android snippets, masked credentials and SDK-specific boundaries.

Existing Android Receiver premium UI also has connected-site surfaces, but that is not the merchant developer wizard for third-party integrations.

## Current SDK Assets

Available:

- `packages/swimpay-node` / `@swimpay/node`
- `packages/swimpay-android` / `@swimpay/android`
- `docs/SDK_WEB_QUICKSTART.md`
- `docs/SDK_ANDROID_QUICKSTART.md`
- `examples/web-node-basic`
- `examples/android-merchant-basic`

These are suitable snippet sources for the wizard.

## Current Backend/API Endpoints

Available:

- `GET /v1/android-merchant/connected-site`
- `POST /v1/android-merchant/connected-site/test`
- `GET /v1/admin/webhook-failures`
- internal webhook worker repository over `webhook_endpoints` and `webhook_deliveries`

Database tables exist:

- `webhook_endpoints`
- `webhook_deliveries`

Existing Android connected-site test endpoint is backend-owned and queues a safe test event with `test_only=true`.

## Missing or Partial Endpoints

Missing production wizard-specific endpoints:

- merchant developer integration read model;
- merchant API key lifecycle;
- public key lifecycle;
- show-once secret lifecycle;
- webhook secret generation lifecycle;
- webhook URL save/update endpoint;
- delivery history endpoint scoped to merchant developer settings;
- delivery replay endpoint scoped to merchant developer settings.

## Sprint Decision

This sprint will build the merchant-facing web wizard UI and guardrail tests without broad auth or secret lifecycle changes.

Secrets will be rendered only as masked placeholders.

Webhook URL/test/history will be represented as safe wizard state. Existing backend-owned test semantics are documented, but full credential/webhook lifecycle remains a follow-up.

## Safety Boundaries

- No secret key in Android snippets.
- No secret key in browser snippets.
- No webhook secret exposed.
- No raw card, raw phone or raw notification payload shown.
- No public fulfillment from `payment.signal_detected` or `payment.needs_review`.
- No auto-confirmation examples.
- No official bank confirmation claim.
- Android snippets do not handle webhooks, bank notifications or local fulfillment.
