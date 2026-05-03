# Task 376 - Copy details short-lived reveal policy

Status: completed

Scope:
- Add `reveal_expires_at`, `masked_identifier` and explicit `destination_value` fields to copy-details responses.
- Add no-store cache headers for API and hosted checkout proxy responses.
- Document that full destination reveal is short-lived and action-bound.

Validation:
- Tests verify response shape and no-store headers.
- The normal checkout page and status responses remain masked.
