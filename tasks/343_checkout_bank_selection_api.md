# Task 343 - Checkout Bank Selection API

## Goal

Expose buyer-safe checkout bank selection endpoints.

## Endpoints

- `GET /v1/checkout/:session_id/receiver-banks`
- `POST /v1/checkout/:session_id/receiver-bank`
- `GET /v1/checkout/:session_id/payer-bank-launchers`
- `POST /v1/checkout/:session_id/payer-bank-launcher`
- `GET /v1/checkout/:session_id/status`

## Requirements

- Persist receiver bank selection on the payment session.
- Persist payer bank launcher selection on the payment session.
- Return buyer-safe labels only:
  - `available`
  - `review_required_beta`
  - `temporarily_unavailable`
- Do not expose internal production trust details.
- Validate session existence and expiry.
- Return clear errors for invalid receiver bank or payer launcher ids.
- Add API tests for selection persistence, status mapping, expired sessions and audit events.

## Safety Notes

- Responses must not claim official bank confirmation.
- Payer launcher selection must not enable or imply payment confirmation.
