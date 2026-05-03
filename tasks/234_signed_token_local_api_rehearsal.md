# Task 234 - Signed-token Local API Rehearsal

Status: completed

## Scope

Exercise the bank evidence production trust API with `signed_token` auth in a local in-process server.

## Result

- Added a signed-token integration rehearsal test.
- The test uses real API routes, real signed-token verification and the in-memory evidence repository.
- Read-only signed operators are denied production trust request permission.

## Boundaries

- Local/in-process only.
- No production deployment.
- No production data.
- No RBAC bypass.
