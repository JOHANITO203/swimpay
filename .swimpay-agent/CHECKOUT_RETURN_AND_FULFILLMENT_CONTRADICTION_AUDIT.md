# Checkout Return And Fulfillment Contradiction Audit

Date: 2026-05-13

## Return flow

## Priority contract
- `aligned`: `swimpay_return_scheme` / `android_return_scheme` prioritaire sur `return_url`.
- `aligned`: URL native construite avec `status`, `payment_session_id`, `order_id`, `external_id`.
- `aligned`: filtre anti-unsafe protocol (`javascript/data/file/content/intent/android-app`).

## Remaining contradiction
- `partial`: fallback final CTA utilise `history.back()` si aucun return target sûr.
- Risque: contexte navigateur embarqué peut revenir vers une page non-marchand.

## Raw API page prevention
- `aligned`: filtre empêche `https://api.*` ou path `/api`/`/v1` comme destination finale.

## Fulfillment/webhook

- `aligned`: vérité produit respectée: fulfillment backend externe via webhook signé, pas via bouton retour.
- `aligned`: événement public final-only (confirm/reject/expire), pas d’event interne buyer-side.
- `missing_test`: pas de test e2e complet ici avec serveur webhook externe réel dans ce sprint d’audit.

## Classification

- Return priority Android > web: `aligned`
- Safe return filtering: `aligned`
- Deterministic fallback when no return target: `partial`
- Fulfillment/webhook separation from UX return: `aligned`

