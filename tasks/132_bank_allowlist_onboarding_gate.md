# 132 - Bank Allowlist Onboarding Gate

## Goal

Require selected bank profiles before Receiver readiness.

## Requirements

- No selected banks means Receiver is not ready.
- Selected banks may be selected, unverified, or review-only.
- `TO_VERIFY` real bank metadata must remain untrusted.
- Unverified/review-only banks may reach `ready_review_only`, not auto-confirm readiness.

## Boundaries

- Do not invent real bank package names or signing certificate fingerprints.

## Status

Completed in Phase 4J.
