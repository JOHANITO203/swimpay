# Task 535 — Auth BFF inventory

Status: completed

Scope:
- Audit current auth/session patterns across API, web merchant/admin routes, receiver routes, SDK/API key routes, developer integration wizard and connected-site surfaces.
- Identify process-global merchant identity, local/dev bearer fallback, missing CSRF, user-controlled merchant identifiers and identity boundaries.
- Produce `.swimpay-agent/AUTH_BFF_INVENTORY.md`.

Constraints:
- Audit first.
- Do not change payment confirmation behavior.
- Do not process real notifications.
- Do not enable auto-confirmation.

