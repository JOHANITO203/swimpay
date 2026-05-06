# Developer Backend Lifecycle Inventory

Sprint: 9E — Developer Integration Backend Lifecycle

## Existing primitives found

- `api_keys`: merchant-scoped key hash table with scopes/status/revocation.
- `webhook_endpoints`: merchant-scoped URL, secret material, enabled events and status.
- `webhook_deliveries`: merchant-scoped delivery records with event id/type, status, attempts, HTTP status, retry time and redacted error fields.
- Android connected-site APIs: safe connected-site status and backend-owned test webhook queue.
- Webhook worker: existing delivery worker and retry/replay primitives.

## Missing before Sprint 9E

- Merchant-scoped integration read model.
- Public key lifecycle for developer UI.
- Show-once secret key generation/rotation.
- Show-once webhook secret generation/rotation.
- Merchant-facing webhook URL save/update endpoint.
- Merchant-scoped delivery history endpoint.
- Merchant-scoped webhook retry endpoint.
- Guardrails proving normal reads do not leak secrets.

## Implemented

- Added `merchant_integrations` migration as the integration lifecycle read model.
- Added backend lifecycle repository under `apps/api/src/developer-integration.ts`.
- Added merchant endpoints under `/v1/merchant/integration`.
- Added encrypted webhook secret material for worker signing and hashed secret material for lifecycle verification/audit.
- Added safe delivery history and backend-owned test/retry endpoints.

## Remaining note

The existing web wizard remains safe if the API is unavailable. The new backend endpoints are now the production data source for credentials, webhook configuration, delivery history and retry/test actions.

