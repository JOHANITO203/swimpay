# Checkout State Priority Audit

Date: 2026-05-13

## Observations

## 1) Final-state priority
- `aligned`: `manual_confirmed/fulfilled/rejected/expired` vont sur l’écran waiting/final, pas sur formulaire.
- `aligned`: tests `checkout_edit=1` confirment que les états finaux gardent la priorité.

## 2) Query param override
- `aligned`: `checkout_edit` n’est plus utilisé pour forcer un retour au formulaire.

## 3) Step resolution source of truth
- `partial`: `resolveCheckoutStep(session)` (web) utilise surtout `status + selected_*` et ignore `checkout_state` canonique pour la navigation.
- Impact: en cas de dérive backend/champs partiels, l’UI peut choisir une étape différente de l’état métier.

## 4) Waiting poll behavior
- `aligned`: endpoint status avec `Cache-Control: no-store` + `Pragma: no-cache`.
- `aligned`: polling script s’arrête sur états finaux (`confirmed/rejected/expired/cancelled`) selon tests.

## 5) “J’ai payé” state-awareness
- `aligned`: backend gère `already_confirmed/already_rejected/already_expired` sans 5xx.
- `partial`: statut `invalid_transition` existe toujours si claim hors fenêtre prévue; UX retombe sur état courant (pas crash), mais la taxonomie de réponse pourrait être encore plus explicite côté UI.

## Classification

- Final-state priority: `aligned`
- Query-param precedence: `aligned`
- Canonical checkout_state usage in renderer: `partial`
- Poll/cache semantics: `aligned`
- Late claim safety: `aligned`

