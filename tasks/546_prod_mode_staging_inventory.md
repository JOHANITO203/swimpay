# Task 546 — Production-mode staging inventory

Status: completed

Scope:
- Audit production-mode environment controls, auth config, BFF session config, Google OAuth config, CSRF, cookie security, API key verification, receiver auth, webhook signing, migration and Docker Compose assumptions.
- Create `.swimpay-agent/PROD_MODE_STAGING_INVENTORY.md`.

Constraints:
- Audit first.
- Do not deploy public production.
- Do not process real bank notifications.

