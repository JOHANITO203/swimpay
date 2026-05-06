# Developer Wizard Live UX Report

Sprint: 9F - Developer Integration Wizard Live UX Wiring

## Inventory

The web Developer Integration Wizard existed at `/merchant/developer-integration`, but credentials, webhook URL, status and delivery history were static.

Sprint 9E backend lifecycle endpoints were available and safe to consume server-side.

## Web client

Added a server-side `MerchantIntegrationClient` seam to `apps/web/src/index.ts`.

The default API client calls:

- `GET /v1/merchant/integration`
- `POST /v1/merchant/integration/keys`
- `POST /v1/merchant/integration/keys/rotate`
- `POST /v1/merchant/integration/webhook-secret/rotate`
- `PUT /v1/merchant/integration/webhook-url`
- `POST /v1/merchant/integration/test-webhook`
- `GET /v1/merchant/integration/webhook-deliveries`
- `POST /v1/merchant/integration/webhook-deliveries/:id/retry`

The client is server-side only and uses bearer auth from `MERCHANT_INTEGRATION_BEARER_TOKEN`, with local/dev fallback to the existing test merchant pattern.

## Credential rendering

The wizard now renders live:

- Merchant ID;
- public key;
- masked secret key;
- masked webhook secret;
- webhook URL;
- webhook status;
- public V1 webhook events.

One-time raw secret values are displayed only on immediate create/rotate action responses and are not placed in URLs.

## Webhook actions

Added web form/action routes for:

- key generation;
- key rotation;
- webhook secret rotation;
- webhook URL save;
- backend-owned test webhook;
- merchant-scoped delivery retry.

Delivery history renders safe event metadata only.

## Guardrails

Updated web tests to prove:

- live backend data renders;
- fallback state is safe when backend is unavailable;
- one-time secrets are shown only on immediate action responses;
- normal reads do not expose `secret_key_once` or `webhook_secret_once`;
- snippets do not include browser/Android secrets;
- Android snippets do not handle webhooks or local fulfillment;
- delivery history does not expose raw payloads, raw phone/card or raw notification text.

Updated product-truth docs/tests so `docs/DEVELOPER_PLUGIN_INTEGRATION.md` no longer presents internal signal/review events as public fulfillment webhooks.

## Remaining limitations

- Production merchant session/auth remains outside this sprint; the web client supports the current server-side bearer seam.
- The visual styling remains the existing wizard style; this sprint focused on live data and safety wiring.

## Commands run

- `npm run --workspace @swimpay/web typecheck` - passed.
- `npx vitest run apps/web/src/developer-wizard.test.ts tests/product-truth-docs.test.ts` - passed.
- `npm run android:doctor` - passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed after removing lint issues from the live renderer path.
- `npm test` - passed, 65 test files and 455 tests.
- `npm run build` - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - passed.
- `COMPOSE_PARALLEL_LIMIT=1 docker compose --env-file .env.example -f infra/docker-compose.yml build swimpay-web` - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --no-build` - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - passed, services healthy except proxy was still in startup health window.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` - passed.
- Live smoke `GET http://localhost:8080/merchant/developer-integration` - passed with HTTP 200.

Android Gradle/device validation was not run because no Android source was touched.
