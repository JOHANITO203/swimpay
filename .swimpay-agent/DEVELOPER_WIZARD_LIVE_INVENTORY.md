# Developer Wizard Live Inventory

Sprint: 9F - Developer Integration Wizard Live UX Wiring

## Current web route

- Route: `/merchant/developer-integration`
- Server file: `apps/web/src/index.ts`
- Renderer: `apps/web/src/screens/MerchantScreens.ts`
- Tests: `apps/web/src/developer-wizard.test.ts`

## Current state

The wizard exists and is safe, but it is mostly static:

- merchant id is hard-coded;
- public key is hard-coded;
- secret key and webhook secret are placeholder masks;
- webhook URL/status/test result are hard-coded;
- delivery history is static;
- Web and Android snippets are static and safe.

## Sprint 9E live endpoints available

- `GET /v1/merchant/integration`
- `POST /v1/merchant/integration/keys`
- `POST /v1/merchant/integration/keys/rotate`
- `POST /v1/merchant/integration/webhook-secret/rotate`
- `PUT /v1/merchant/integration/webhook-url`
- `POST /v1/merchant/integration/test-webhook`
- `GET /v1/merchant/integration/webhook-deliveries`
- `POST /v1/merchant/integration/webhook-deliveries/:id/retry`

## Wiring plan

Add a narrow server-side `MerchantIntegrationClient` to the web app, injected through `buildWebServer`.

The wizard should render:

- merchant id;
- public key;
- masked secret key;
- masked webhook secret;
- webhook URL;
- webhook status;
- public V1 webhook events;
- merchant-scoped delivery history.

Actions:

- generate/rotate API key;
- rotate webhook secret;
- save webhook URL;
- send backend-owned test webhook;
- retry a merchant-scoped failed delivery.

## Fallback behavior

If the backend is unavailable, render a merchant-safe unavailable state and keep snippets visible.

The UI must never expose raw secrets except one-time creation/rotation responses, and those must not be placed in URLs.

## Guardrail focus

- No raw secret key in normal reads.
- No raw webhook secret in normal reads.
- No secret keys in browser or Android snippets.
- No raw webhook payloads in delivery history.
- No internal public fulfillment events.
- No auto-confirmation wording.
- No official bank confirmation claim.
