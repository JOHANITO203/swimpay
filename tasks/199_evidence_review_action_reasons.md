# 199 Evidence Review Action Reasons

Status: completed

## Goal

Use explicit operator review reason codes instead of freeform-only reasons.

## Completed

- Added allowed reason codes:
  - `package_verified_for_review_only`
  - `cert_matches_operator_expectation`
  - `package_not_expected`
  - `cert_changed`
  - `stale_evidence`
  - `duplicate_evidence`
  - `insufficient_evidence`
  - `synthetic_test_only`
  - `other`
- Added optional redacted `notes`.
- Invalid reason codes are rejected.
- Legacy `reason` is still accepted as redacted `other` for compatibility.
