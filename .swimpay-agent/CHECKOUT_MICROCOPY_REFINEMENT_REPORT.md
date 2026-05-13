# Checkout Microcopy Refinement Report

Date: 2026-05-13

## Scope

Updated buyer-facing Step 1 copy only. No payment runtime, webhook, matching or confirmation behavior was changed.

## Changes

- Step 1 supporting copy now reads: `Veuillez remplir le formulaire de donnees ci-dessous`.
- Sensitive-data notice now reads: `SwimPay ne collecte pas vos donnees sensibles`.

## Product Boundary

- PAN sensitive boundary remains unchanged.
- No CVV, expiry, PIN or SMS code collection was added.
- No auto-confirmation or payment-confirmed semantic change was introduced.

## Tests

- `apps/web/src/checkout.test.ts` asserts the new copy is rendered and the previous strings are absent.

## Validation Update

- `npm run checkout:screenshot:verify` failed before recording because the buyer-info mobile baseline still contained the previous copy.
- `npm run checkout:screenshot:record` updated the intentional visual baseline.
- `npm run checkout:screenshot:verify` passed after recording.
