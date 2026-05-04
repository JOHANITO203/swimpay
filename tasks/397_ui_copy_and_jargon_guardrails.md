# Task 397 — UI copy and jargon guardrails

Status: completed

Scope:
- Strengthen web UI tests for forbidden merchant-facing jargon.
- Assert exact onboarding copy, masked values and no official bank confirmation claim.

Acceptance:
- `apps/web/src/copy-guardrails.test.ts` covers onboarding, merchant screen gaps, review detail, checkout wording and masking.
- Tests avoid backend behavior changes.
