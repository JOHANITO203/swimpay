# Task 426 — Android dashboard lively empty states

Status: completed

Scope:
- Replace dead unavailable states on the dashboard with useful merchant-facing empty states.
- No payments: `Aucun paiement détecté pour le moment` and `Lancez un test`.
- No reviews: `Aucun paiement à confirmer`.
- No sales: `Vos ventes apparaîtront ici après validation des paiements.`

Safety:
- Do not invent fake live payments.
- Keep local/system state separate from webhook state.
