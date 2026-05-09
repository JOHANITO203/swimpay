# Task 707 - Harden backend production auth and secrets

Goal: remove production test shortcuts and unsafe defaults before staging-prod exposure.

Requirements:

- `Bearer test_*` must be development/test-only and denied by default.
- Production route handlers must not accidentally allow test merchant identity.
- API key scopes must be enforced consistently on SDK-facing routes.
- Production secrets must fail fast when missing instead of using local defaults.
- Webhook URLs must reject localhost, private, link-local and otherwise unsafe hosts.
- No public webhook semantics changes.

Validation:

- Add tests proving production rejects `Bearer test_*` on affected routes.
- Add tests for scope enforcement.
- Add tests for missing production secrets.
- Add tests for webhook URL SSRF rejection.
