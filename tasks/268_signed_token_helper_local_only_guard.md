# Task 268 - Signed Token Helper Local-only Guard

Status: completed

Keep the signed operator token helper local-only.

Requirements:

- do not promote `scripts/operator-token-helper.mjs` to production lifecycle tooling;
- production credential lifecycle remains external/operator-managed;
- generated local tokens must not be committed.

Result:

- `docs/PRODUCTION_ADMIN_AUTH_PREFLIGHT.md` reiterates the local-only boundary.
- The production preflight checks the operator lifecycle and admin auth docs.
