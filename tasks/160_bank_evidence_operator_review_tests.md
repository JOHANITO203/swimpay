# 160 - Bank Evidence Operator Review Tests

## Goal

Cover evidence submission, review, audit and safety behavior.

## Required Tests

- submission creates `pending_operator_review`;
- duplicate evidence is idempotent or clearly rejected;
- `TO_VERIFY` evidence cannot become trusted;
- approve-review-only does not enable auto-confirm;
- reject stores reason;
- admin review requires RBAC permission;
- `read_only` cannot approve;
- audit events are written;
- raw PII is not exposed;
- `synthetic_debug_only` evidence cannot be production trust.
