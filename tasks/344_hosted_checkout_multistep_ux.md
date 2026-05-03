# Task 344 - Hosted Checkout Multistep UX

## Goal

Update hosted checkout to a mobile-first PSP-like flow while keeping SwimPay's actual behavior clear and safe.

## Flow

1. Pay with SwimPay intro.
2. Receiver bank selection.
3. Payer bank launcher selection.
4. Payment instructions.
5. Awaiting signal.
6. Signal detected.
7. Needs review.
8. Confirmed.
9. Expired or rejected.

## Requirements

- Use same-origin web proxy routes where needed so browser code does not depend on direct API CORS.
- Add copy amount and copy reference actions.
- Add open-bank action placeholder/fallback.
- Use safe wording:
  - `SwimPay recherchera le signal de paiement côté marchand.`
- Avoid unsafe wording such as automatic confirmation promises.
- Add web tests for the multi-step render, safe copy, status polling, copy controls and fallback states.

## Safety Notes

- Buyer UI must not claim official bank confirmation.
- Buyer clicking "I paid" is only a claim and must not confirm payment.
