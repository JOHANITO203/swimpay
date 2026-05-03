# Task 346 - Checkout Status Polling and Events

## Goal

Map internal payment/session states to buyer-safe checkout statuses for hosted checkout polling.

## Buyer-safe Statuses

- `awaiting_payment`
- `searching_signal`
- `signal_detected`
- `needs_review`
- `confirmed`
- `expired`
- `not_validated`

## Requirements

- Add or update status polling response contracts.
- Ensure status copy is buyer-safe and review-first.
- Ensure `signal_detected` does not present as confirmed.
- Ensure `buyer_claimed_paid` maps to a searching/waiting state, not confirmed.
- Add tests for every status mapping.

## Safety Notes

- Do not expose raw PII in status responses.
- Do not emit official bank confirmation wording.
