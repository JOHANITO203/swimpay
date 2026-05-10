# Checkout Method Fallback UX Report

generated_at: 2026-05-10T08:35:00+03:00

## Final UX Rules

- If merchant has card only, buyer sees only `Carte`.
- If merchant has SBP/phone only, buyer sees only `SBP / telephone`.
- If merchant has both, buyer sees both choices.
- If merchant has no active receiving route, checkout opens on `Paiement indisponible` instead of collecting buyer data.
- If a selected method becomes unavailable mid-flow, the buyer sees an actionable fallback.

## Actionable Fallbacks

Card available:

- Message: `Ce marchand accepte actuellement : Carte.`
- Actions: `Payer par carte`, `Actualiser les methodes`, `Retour au marchand`

SBP/phone available:

- Message: `Ce marchand accepte actuellement : SBP / telephone.`
- Actions: `Payer par SBP`, `Actualiser les methodes`, `Retour au marchand`

No method available:

- Message: `Ce marchand n'a pas encore configure de moyen de reception actif.`
- Actions: `Actualiser`, `Retour au marchand`

## Interaction Detail

The switch actions reopen the buyer information panel and preselect the compatible method with `data-select-method`, so the buyer can continue without hitting the same dead end again.

## Visual Notes

- The SBP method keeps a phone icon for visual clarity.
- Text remains short and checkout-facing.
- No internal SwimPay Intelligence details are exposed to the buyer.

## Validation

- Web checkout tests cover card-only, SBP-only, no active route and stale-method fallback states.
- Copy guardrails were updated so `/checkout/any` follows the new no-route truth instead of rendering the intro as if checkout could proceed.
- Full root validation passed.
