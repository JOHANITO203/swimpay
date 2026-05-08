# Task 624 - Android auth/login/onboarding truth hardening

Status: completed

Goal: make the Android login and onboarding contract match product truth clearly for staging-prod.

Scope:
- Account entry remains before onboarding.
- `Creer un compte` creates a lightweight merchant account, stores a mobile session, and starts onboarding.
- `Se connecter` is recovery/login and can restore a linked Google profile through backend exchange.
- Google linking in `Parametres > Securite` calls the backend-owned link endpoint and never stores/exposes Google tokens.
- Device lookup and device proof remain privacy-safe and avoid raw identifiers.

Guardrails:
- Google is optional recovery/linking only, never required onboarding.
- Personal and business profiles have the same merchant app rights and are not admin personas.
- Do not collect first/last names.
- Android does not confirm payments or send webhooks.

Validation:
- Add/update Android and API/contract tests for session restoration, Google link safety, and account-entry truth.
