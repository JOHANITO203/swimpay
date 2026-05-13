# Checkout Contradiction Fix Report

Date: 2026-05-13

## Correctifs appliqués

1. Sender bank source-of-truth réalignée: Step 1 utilise `available_sender_banks` en source primaire.
2. `payer_bank_launchers` conservé uniquement pour la couche launcher/deeplink (fallback UI si payload absent).
3. Mentions "Runtime verified" supprimées du checkout.
4. Retour fallback déterministe introduit vers `/merchant/return-unavailable` (plus de `history.back()` pur).

## Fichiers principaux modifiés

- `apps/web/src/screens/CheckoutScreen.ts`
- `apps/web/src/index.ts`
- `apps/web/src/checkout.test.ts`

## Respect des garde-fous

- Aucun changement sur `payment.confirmed` semantics.
- Aucun auto-confirm.
- Aucun changement d’événements webhook publics.
- Aucun retour utilisé comme preuve de paiement.

