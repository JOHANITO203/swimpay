# Developer Wizard Auth Inventory

Generated: 2026-05-07

## Scope

Sprint 9G audited the live Developer Integration Wizard auth boundary after Sprint 9F wired the wizard to backend lifecycle endpoints.

## Multi-agent audit result

Agent A found:
- `/merchant/developer-integration` and receiving-method routes were public at the web layer.
- Merchant identity was process-global through `CHECKOUT_MERCHANT_ID`.
- Receiving-method create/update omitted backend Authorization headers.

Agent B found:
- API developer integration endpoints used local `Bearer test_<merchant_id>` parsing.
- Generated API keys exist, but broad production API-key auth is not yet wired for all merchant endpoints.
- Web developer integration already disabled itself in production without a token, but explicit local `test_*` token still needed rejection.

Agent C found:
- Existing guardrails protected copy/secrets, but did not prove production cannot use a local `Bearer test_*` merchant auth path.

## Current state before fix

| Area | Status | Notes |
| --- | --- | --- |
| Web wizard backend client | partial | Live client existed, but bearer resolution was implicit. |
| Production no-token state | acceptable | Wizard rendered unavailable if no integration bearer was configured. |
| Production local test token rejection | missing | Explicit `MERCHANT_INTEGRATION_BEARER_TOKEN=test_*` was not rejected. |
| Receiving-method reads | partial | Authorization header existed. |
| Receiving-method writes | risky | Authorization and Content-Type headers were missing. |
| API developer integration production auth | risky | Local `test_*` token parser was not environment-gated. |
| Full merchant web session | missing | Real session/cookie/CSRF remains follow-up. |

## Decision

Implement a narrow hardening pass:
- centralize web server merchant bearer resolution;
- keep local `test_*` fallback only outside production;
- reject explicit `test_*` bearer in production;
- disable wizard actions when no approved server token/client exists;
- reject production `test_*` bearer on developer integration backend routes;
- fix receiving-method write request headers.

## Out of scope

- Full merchant login/session implementation.
- CSRF middleware.
- Broad API key verification across every merchant endpoint.
- Payment runtime changes.
- Webhook/payment confirmation behavior changes.
