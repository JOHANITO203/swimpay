# Task 507 — Merchant-scoped delivery history

Status: completed

Scope:
- Added `GET /v1/merchant/integration/webhook-deliveries`.
- Returns safe public V1 delivery fields only.

Safety:
- No raw payload, webhook secret, card, phone or notification text is returned.
- Internal signal/review events are not exposed as public fulfillment events.

