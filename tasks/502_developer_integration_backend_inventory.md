# Task 502 — Developer integration backend inventory

Status: completed

Scope:
- Audited API keys, merchant credentials, public key, webhook secret, webhook URL, connected-site status, webhook test, delivery history and retry/replay primitives.

Result:
- Existing primitives: `api_keys`, `webhook_endpoints`, `webhook_deliveries`, Android connected-site test endpoint and webhook worker tables.
- Missing before this sprint: merchant-scoped integration read model, show-once key lifecycle, webhook URL persistence API, merchant delivery history API and merchant-scoped retry/test endpoints.

