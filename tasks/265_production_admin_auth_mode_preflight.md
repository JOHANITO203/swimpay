# Task 265 - Production Admin Auth Mode Preflight

Status: completed

Define a non-mutating production admin authentication preflight.

Requirements:

- reject `ADMIN_AUTH_MODE=dev_token` for production;
- reject configured development admin token variables for production;
- require signed-token or future external identity-provider mode;
- do not deploy;
- do not generate production secrets;
- do not change payment decision behavior.

Result:

- Added `scripts/production-admin-auth-preflight.mjs`.
- Added `npm run production:admin-auth-preflight`.
