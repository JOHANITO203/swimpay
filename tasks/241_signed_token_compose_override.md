# Task 241 - Signed Token Compose Override

Status: completed

## Scope

Add a local-only Docker Compose override for signed admin tokens.

## Result

- Added `infra/docker-compose.signed-admin.override.yml`.
- The override sets `ADMIN_AUTH_MODE=signed_token` for API and web.
- The override requires `ADMIN_TOKEN_HMAC_SECRET`.
- Dev-token fields are blanked in the override.

## Boundary

This override is for deliberate local rehearsal only. It is not a production deployment file.
