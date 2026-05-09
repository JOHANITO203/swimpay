# Buyer Checkout Step 4 Report

## Implemented

- `J'ai payé` is allowed only after `receiver_armed`.
- It sets `buyer_claimed_paid`.
- It does not confirm the payment.
- It does not emit webhook.
- It does not create a final event.

## Waiting States

Buyer-safe states remain:

- payment pending;
- searching signal;
- signal detected;
- needs review;
- confirmed;
- expired;
- rejected.

