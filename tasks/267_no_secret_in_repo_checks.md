# Task 267 - No Secret In Repo Checks

Status: completed

Add checks that production examples do not contain committed admin tokens or HMAC secrets.

Result:

- `scripts/production-admin-auth-preflight.mjs` scans production template files for committed admin token or secret-like values.
- The scan allows blank placeholders and Compose-required external interpolation only.
