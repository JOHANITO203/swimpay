# Checkout Return Fallback Fix Report

Date: 2026-05-13

## Problème

Quand `returnScheme` et `return_url` sont absents/non sûrs, le checkout retombait sur `history.back()`, non déterministe en webview.

## Correctif

- Nouveau fallback stable:
  - `/merchant/return-unavailable?payment_session_id=...&order_id=...&external_id=...`
- Boutons impactés:
  - `Retour au marchand`
  - `Retourner au marchand`
  - `Contacter le marchand` en état rejeté

## Garanties

- Pas de page JSON brute en destination finale.
- Le retour reste UX-only.
- Fulfillment toujours via webhook signé côté backend externe.

## Test ajouté

- Route `/merchant/return-unavailable` rend une page HTML stable et lisible.

