# Task 374 - Copy details session hardening

Status: completed

Scope:
- Harden `GET /v1/checkout/:session_id/receiving-route/copy-details`.
- Require active, non-expired checkout session.
- Require a selected enabled receiving route that belongs to the session merchant and selected receiver bank.
- Return full destination only for the selected receiving route and only through the explicit copy action.
- Keep normal status, webhooks and audits masked.

Validation:
- API tests cover active, expired, inactive/rejected, wrong-route and disabled-route behavior.
- No official bank confirmation wording or auto-confirm behavior is introduced.
