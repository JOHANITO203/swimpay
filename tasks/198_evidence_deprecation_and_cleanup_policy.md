# 198 Evidence Deprecation And Cleanup Policy

Status: completed

## Goal

Add a non-destructive deprecation lifecycle action for stale or superseded evidence.

## Completed

- Added `POST /v1/admin/bank-evidence/:id/deprecate`.
- Deprecation changes status to `deprecated` without deleting evidence.
- Deprecation writes a redacted `bank_evidence.deprecated` audit event.
- Deprecated evidence cannot request production trust.
- Deprecation never enables auto-confirmation.
