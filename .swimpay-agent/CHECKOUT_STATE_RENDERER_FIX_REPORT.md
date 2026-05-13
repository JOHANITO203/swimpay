# Checkout State Renderer Fix Report

Date: 2026-05-13

## Résultat

- Le renderer checkout lit d’abord les états canoniques `checkout_state` / `buyer_safe_status`.
- Les états finaux gardent la priorité stricte: `confirmed`, `rejected`, `expired` (et `cancelled` via safe status si présent).
- Les champs de session restent fallback seulement.
- `checkout_edit=1` reste ignoré (tests conservés).

## Détail technique

- `resolveCheckoutStep`:
  - priorité final state
  - fallback structuré
  - mapping canonique `checkout_state -> étape UI`
  - fallback legacy fields

## Régression ciblée couverte

- cas `status` non final + `checkout_state=confirmed` => UI confirmé (pas retour formulaire).

