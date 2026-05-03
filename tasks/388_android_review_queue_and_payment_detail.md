# Task 388 - Android review queue and payment detail

Status: completed

Scope:
- Implement review queue state and payment detail state.
- Translate technical reason codes to simple merchant labels.
- Add confirm/reject action contracts.

Guardrails:
- Android must not confirm or auto-confirm by itself.
- Rejecting a signal must not reject the order by default.
