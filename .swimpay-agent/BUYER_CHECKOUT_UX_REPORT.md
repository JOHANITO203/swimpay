# Buyer Checkout UX Report

Generated: 2026-05-04T21:05:00+03:00

## Scope

Frontend-only buyer checkout UX realignment.

Untouched:

- backend;
- APIs;
- contracts;
- workers;
- database;
- payment decision logic;
- state machines;
- Android notification processing;
- real bank notification processing;
- webhooks;
- auto-confirmation.

## Screens Audited

Audited and documented in `.swimpay-agent/BUYER_CHECKOUT_SCREEN_INVENTORY.md`:

1. Pay with SwimPay intro.
2. Choisir une banque.
3. Choisir comment payer.
4. Instructions carte.
5. Instructions téléphone.
6. Ouvrir votre banque.
7. Paiement en attente.
8. Recherche du signal.
9. Signal détecté.
10. Vérification en cours.
11. Paiement validé.
12. Session expirée.
13. Paiement non validé.

## Screens Created or Completed

Updated `apps/web/src/screens/CheckoutScreen.ts` to render the checkout as staged buyer UI:

- intro card with benefits;
- bank-first selection;
- payment method selection after bank;
- payer launcher selection;
- separate card and phone instruction variants;
- desktop QR handoff panel;
- dedicated buyer status panels.

## Bank-first Flow Polish

The buyer bank step now shows only:

- bank name;
- initial placeholder mark;
- availability label.

It does not show:

- card details;
- phone details;
- route details;
- raw destination values.

## Payment Instructions

Card route:

- shows `Carte`;
- shows masked card only;
- shows amount and reference;
- provides `Ouvrir ma banque` and `J'ai payé`.

Phone route:

- shows `Téléphone`;
- shows masked phone only;
- shows amount and reference;
- shows `Votre numéro d’envoi`;
- provides `Ouvrir ma banque` and `J'ai payé`.

Raw destination values remain outside normal rendered HTML.

## Checkout States

Dedicated state panels now cover:

- `awaiting_payment` -> `Paiement en attente`;
- `buyer_claimed_paid` / `searching_signal` -> `Recherche du signal`;
- `signal_detected` -> `Signal détecté`;
- `needs_review` / `matching` -> `Vérification en cours`;
- `manual_confirmed` / controlled recognized states -> `Paiement validé`;
- `expired` -> `Session expirée`;
- `rejected` / not validated -> `Paiement non validé`.

These panels are presentation-only and do not alter backend state mapping.

## Desktop QR Handoff

Added a desktop side card with:

- QR placeholder;
- amount;
- reference;
- explicit copy-details action label;
- manual instructions.

No raw card or phone is embedded in this surface.

## Tests

Updated:

- `apps/web/src/checkout.test.ts`
- `apps/web/src/copy-guardrails.test.ts`

Coverage added:

- intro copy;
- bank-first route privacy;
- payment method reveal;
- card/phone instruction variants;
- buyer status states;
- desktop QR handoff presence;
- no official bank confirmation claims;
- no payment guarantee wording;
- no auto-confirm wording;
- no raw card/phone in normal HTML.

## Limits Remaining

- Real QR generation is intentionally not added in this pass.
- Real official bank logo assets are not added.
- Browser screenshot QA is still recommended for visual spacing and responsive inspection.

## Result

Buyer checkout frontend is now aligned with the requested staged UX while preserving the existing business logic and contracts.
