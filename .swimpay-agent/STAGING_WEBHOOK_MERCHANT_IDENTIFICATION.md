# Staging Webhook Merchant Identification

Date: 2026-05-13

## Observed confirmed test session

- `payment_session_id`: `a2c984ed-3070-4537-a163-917043884646`
- `order_id`: `e56ed372-d8c6-48d0-912a-dc01abb12a68`
- `external_id`: redacted in this report (present in checkout return-unavailable query logs)
- `payment_sessions.status`: `manual_confirmed`
- `audit_events.review.confirmed`: present

## Status

- Merchant review decision pipeline: **working**
- Final confirmation state write: **working**
- Webhook fulfillment path: **not configured for this merchant**

## Why

- `webhook_endpoints`: no rows in staging for this merchant window
- `webhook_deliveries`: no rows in staging for this merchant window

