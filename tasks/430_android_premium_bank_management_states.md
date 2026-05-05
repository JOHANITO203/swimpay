# Task 430 - Android premium bank management states

Scope: frontend-only Android premium UI.

Implement typed bank management UI states for the five V1 banks:

- enabled
- action_required
- paused
- empty
- loading/error via `PremiumScreenState`

Guardrails:

- do not expose package/cert/trust internals
- do not enumerate installed apps
- do not imply production trust or auto-confirm
- use merchant-facing copy only
