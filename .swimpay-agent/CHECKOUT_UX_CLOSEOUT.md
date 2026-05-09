# Checkout UX Closeout

Date: 2026-05-09

## Summary

The buyer checkout has been refactored into a cleaner Apple-like guided flow while preserving the existing payment contracts.

## Final Flow

1. Intro: `Payer avec SwimPay`
2. Buyer information: name, payment method, sender bank, method-specific input
3. Instructions: amount, reference, receiver destination, copy buttons, open bank
4. Waiting: timeline and merchant-validation status

## Product Truth Preserved

- `J'ai paye` does not confirm.
- `Ouvrir ma banque` only arms the receiver.
- Signal detected is not final.
- `payment.confirmed` remains merchant manual confirmation only.
- Public webhooks remain final-only.
- `official_bank_confirmation=false` remains the truth.

## Validation

Targeted web checkout tests passed.

Full root validation passed:
- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` - 76 files, 573 tests passed
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`

## Next Step

After validation and redeploy, run a staging browser/device visual pass on a real `checkout_url` created by the SDK.
