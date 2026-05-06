# Developer Backend Lifecycle Report

Sprint: 9E — Developer Integration Backend Lifecycle

## Inventory result

The backend already had `api_keys`, `webhook_endpoints`, `webhook_deliveries` and a webhook worker foundation, but lacked a merchant-facing lifecycle API for the Developer Integration Wizard.

## Credential read model

Added `merchant_integrations` as an additive merchant-scoped read model with:

- merchant id;
- public key;
- masked secret key metadata;
- masked webhook secret metadata;
- webhook URL/status;
- integration type;
- created/updated timestamps.

## API key lifecycle

Added endpoints for:

- `GET /v1/merchant/integration`;
- `POST /v1/merchant/integration/keys`;
- `POST /v1/merchant/integration/keys/rotate`.

Normal reads return masked secret only. Creation and rotation return `secret_key_once` exactly once.

## Webhook secret lifecycle

Added:

- `POST /v1/merchant/integration/webhook-secret/rotate`.

Webhook secret is hashed for lifecycle checks and encrypted for backend-owned webhook signing. Normal reads return only the masked secret. Rotation returns `webhook_secret_once` exactly once.

## Webhook URL persistence

Added:

- `PUT /v1/merchant/integration/webhook-url`.

Validation requires HTTPS in production and allows localhost only outside production. Dangerous protocols are rejected.

## Merchant delivery history

Added:

- `GET /v1/merchant/integration/webhook-deliveries`.

Returned fields are safe: event id/type, delivery id, status, attempts, HTTP status, timestamps and sanitized error summary. No raw payload or secret is returned.

## Webhook test/retry backend

Added:

- `POST /v1/merchant/integration/test-webhook`;
- `POST /v1/merchant/integration/webhook-deliveries/:id/retry`.

Test webhooks are backend-owned, test-only and non-fulfillment. Retry is merchant-scoped.

## Wizard backend wiring

The Developer Integration Wizard now has production backend lifecycle endpoints available for credentials, webhook URL, test delivery, delivery history and retry. The existing UI remains safe if the backend is unavailable.

## Guardrails

Added `apps/api/src/developer-integration.test.ts` covering:

- normal reads do not return raw secrets;
- show-once secret key lifecycle;
- show-once webhook secret lifecycle;
- webhook URL validation;
- backend-owned test webhook cannot trigger fulfillment;
- delivery history sanitizes secrets/PII;
- retry is merchant-scoped;
- no internal public fulfillment events;
- no auto-confirm or official bank confirmation claim.

## Remaining limitations

- No broad auth rewrite was introduced; current foundation uses the existing merchant bearer pattern.
- The wizard backend lifecycle is now available; the next sprint should wire the visual wizard controls fully to these live endpoints.
- The wizard UI can continue to render safe fallback content when the backend is unavailable.

## Commands run

- `npm run android:doctor` - passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm test` - passed, 65 test files and 455 tests.
- `npm run build` - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - passed.
- `COMPOSE_PARALLEL_LIMIT=1 docker compose --env-file .env.example -f infra/docker-compose.yml build swimpay-api swimpay-web swimpay-job-worker` - passed after adding the job worker security package dependency.
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --no-build` - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - passed, services healthy.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` - passed.
- Live smoke `GET /v1/merchant/integration` with dev bearer - passed with masked credentials and no raw secrets.

Android Gradle/device validation was not run because no Android source was touched in this backend lifecycle sprint.
