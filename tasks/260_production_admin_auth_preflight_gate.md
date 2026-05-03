# Task 260 - Production Admin Auth Preflight Gate

Add a non-mutating preflight/readiness gate for operator identity and admin auth configuration.

Requirements:

- fail if required docs are missing;
- fail if production lifecycle controls are not documented;
- fail if local token helper is not marked non-production;
- document that `ADMIN_AUTH_MODE=dev_token` is forbidden in production.

