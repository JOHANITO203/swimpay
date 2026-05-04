# Task 394 — Merchant state, empty and error screens

Status: completed

Scope:
- Add simple visual state panels for ready, action required, empty, error, offline, expired and rejected states.
- Keep states visual-only; do not alter backend state machines.

Acceptance:
- Tests/configuration screens expose simple copy such as `Action nécessaire`, `Aucun paiement à vérifier`, and `Site non joignable`.
- No technical internal status is shown to merchants.
