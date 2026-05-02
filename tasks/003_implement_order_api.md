# Task 003 — Implement Order API

## Goal

Implement order creation and retrieval.

## Read first

- `docs/06_API_SPEC.md`
- `docs/24_ORDER_AND_SESSION_STATE_MACHINES.md`
- `docs/11_SECURITY_AND_PRIVACY.md`

## Requirements

Implement:

- `POST /v1/orders`
- `GET /v1/orders/:id`

On create:

- validate amount and currency;
- normalize and HMAC buyer phone;
- mask buyer phone;
- create order;
- create payment session placeholder or call payment session module;
- emit audit event;
- return checkout URL.

## Acceptance criteria

- Valid order creates DB record.
- Duplicate `external_id` per merchant rejected or idempotently handled.
- Buyer phone is not stored raw.
- Audit event created.
- Tests cover validation and creation.
