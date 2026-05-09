# Expected Payment Profile Report

## Implemented

- Added durable Expected Payment Profile fields to `payment_sessions` through migration `014_expected_payment_profile.sql`.
- Added server derivation for:
  - buyer name raw inputs;
  - normalized name and variants;
  - payment method: `card` or `sbp`;
  - sender bank id;
  - sender card last4, masked value and HMAC;
  - sender phone masked value and HMAC;
  - display amount, payable amount and reconciliation delta;
  - expected payment fingerprint.

## Contract Rules

- Merchant id and payment session id are server-owned.
- Full PAN is accepted only as Step 1 input and is never returned after submission.
- Phone is accepted only as Step 1 input for SBP/phone flow and is never returned raw.
- The expected fingerprint is HMAC-derived from merchant, session, payable amount, reference, bank, method and expiry.

## Database

- Added indexes for expected profile lookup and fingerprint uniqueness.
- Added check constraints for amount bounds and method-specific card/phone hints.

