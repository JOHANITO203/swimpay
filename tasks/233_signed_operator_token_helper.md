# Task 233 - Signed Operator Token Helper

Status: completed

## Scope

Add a local development helper for generating signed operator tokens accepted by `ADMIN_AUTH_MODE=signed_token`.

## Result

- Added `scripts/operator-token-helper.mjs`.
- Added `npm run operator:tokens`.
- Helper creates separate requester, approver and revoker identities.
- Helper can render masked token output for reports.
- Helper does not alter RBAC, does not expose secrets in structured output and does not enable auto-confirmation.

## Boundaries

- Local development/rehearsal only.
- No production secrets.
- No payment decision behavior.
- No real notification processing.
