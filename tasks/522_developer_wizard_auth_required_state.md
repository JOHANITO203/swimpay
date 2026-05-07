# Task 522 - Developer wizard auth-required state

Status: completed

Implementation:
- Developer wizard unavailable state now disables credential, webhook URL, test webhook and retry buttons.
- POST actions remain safe and render unavailable/action-not-recorded messages when no client exists.
- One-time secrets remain rendered only from immediate successful backend action responses.

Copy:
- Merchant-facing copy remains simple:
  - `Connexion en attente`
  - `Service momentanément indisponible.`

Privacy:
- No raw secret, webhook secret, phone, card or notification text is rendered in unavailable states.
