# SwimPay Intelligence Expected Profile Matching Report

## Implemented

- Signal runtime now carries Expected Payment Profile fields from `payment_sessions` into Payment Intent Gate candidates:
  - payable amount;
  - display amount;
  - reconciliation delta;
  - payment method;
  - sender bank id;
  - sender card HMAC/mask/last4;
  - sender phone HMAC/mask;
  - buyer first/last raw names.
- Payment Intent Gate now receives the richer intent payload.

## Current Matching Behavior

- Active intent, exact amount, bank, route, reference and phone hints remain the strongest active criteria.
- Card and name fields are now available to the runtime payload; deeper scoring for card/name variants can be expanded in a future dedicated matching sprint.

## Safety

- No single field confirms payment.
- Strong match still creates manual review only.
- `payment.confirmed` remains merchant-manual-confirmation-only.

