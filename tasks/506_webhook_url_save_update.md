# Task 506 — Webhook URL save/update

Status: completed

Scope:
- Added `PUT /v1/merchant/integration/webhook-url`.
- Validates HTTPS in production and allows localhost only outside production.
- Rejects empty, oversized and dangerous protocol URLs.

Safety:
- URL update is merchant-scoped and does not trigger fulfillment.

