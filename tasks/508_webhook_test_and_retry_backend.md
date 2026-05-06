# Task 508 — Webhook test and retry backend

Status: completed

Scope:
- Added backend-owned `POST /v1/merchant/integration/test-webhook`.
- Added merchant-scoped `POST /v1/merchant/integration/webhook-deliveries/:id/retry`.

Safety:
- Test event is marked test-only and non-fulfillment.
- Retry is backend-owned and merchant-scoped.

