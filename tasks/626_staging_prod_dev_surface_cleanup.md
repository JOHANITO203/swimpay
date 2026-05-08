# Task 626 - Staging/prod dev surface cleanup

Status: completed

Goal: ensure staging-prod paths do not depend on dev-only defaults or mock-only behavior.

Scope:
- Identify active `dev`, `debug`, `mock`, `test_` or local-only fallbacks that can affect staging-prod.
- Fail closed in production/staging where secrets or backend URLs are missing.
- Keep local development support explicit and isolated.

Guardrails:
- Do not remove local developer productivity paths when they are isolated to local/dev.
- Do not deploy production.
- Do not commit real secrets.
- Do not process real bank notifications.

Validation:
- Add guardrails or report remaining external/deployment-only items.
