# Checkout Contradiction Review

Date: 2026-05-13  
Scope: hosted buyer checkout, SDK order creation, payment session, expected profile, sender/receiver bank split, claim flow, return flow, webhook fulfillment.

## Executive Summary

Le checkout est globalement mieux aligné qu’avant (late buyer claim idempotent, priorité états finaux, `checkout_edit` neutralisé), mais il reste des contradictions de contrat et de source de vérité qui peuvent générer des bugs UX en staging.

## Contradictions (global)

1. `partial` — Step resolver UI basé surtout sur champs session/status, pas sur `checkout_state` canonique.
2. `contradictory` — Le sélecteur banque d’envoi UI s’appuie sur `payer_bank_launchers` et non `available_sender_banks`.
3. `partial` — Logos UI calculés localement (`bankLogoAssetKey`) au lieu d’utiliser en priorité `logo_asset_key` contractuel.
4. `aligned` — `J’ai payé` tardif est idempotent (`already_confirmed/rejected/expired`) côté backend.
5. `aligned` — `checkout_edit=1` ne masque plus les états finaux/waiting.
6. `partial` — Fallback “Retourner au marchand” tombe sur `history.back()` si URL manquante/non-safe (acceptable UX, mais pas déterministe).
7. `aligned` — `payment.confirmed` ne dépend pas du bouton retour.
8. `missing_test` — Scénarios multi-tab / session stale encore incomplets côté tests E2E.

## Risques critiques

- **Risque A (métier/UI)**: confusion sender/receiver si une future modif backend change `available_sender_banks` sans impact `payer_bank_launchers` (UI peut diverger silencieusement).
- **Risque B (visuel/contrat)**: logos partiels si mapping local ne suit pas le registre d’assets.
- **Risque C (retour final)**: fallback `history.back()` peut ramener vers une page inattendue en contexte navigateur embarqué.

