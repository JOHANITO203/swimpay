# Task 428 — Android backend state fallbacks

Status: completed

Scope:
- Provide clear backend-backed loading, ready, empty, action-required, offline and error states.
- Backend unreachable copy:
  - `Connexion en attente`
  - `Les données seront synchronisées dès que SwimPay sera connecté.`

Safety:
- Preserve existing Android repository contracts.
- Do not expose raw technical errors to merchants.
