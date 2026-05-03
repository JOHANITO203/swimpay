# Task 173 - Trust Policy Tests

Status: completed

Added tests covering:

- `TO_VERIFY` cannot request production trust;
- `synthetic_debug_only` cannot request production trust;
- rejected/pending evidence cannot request production trust;
- review-only evidence can request production trust;
- direct pending to production trust approval is blocked;
- read-only/operator roles cannot approve production trust;
- admin approval works only after request and dual-control;
- approval does not enable auto-confirmation;
- revocation removes production trust;
- audit events are written;
- raw PII is not exposed.
