# Task 488 - Android checkout return handling

Sprint: 9C - Android Merchant SDK / Helper Production Readiness

Goal:
Implement return/deep-link parsing helpers.

Acceptance:
- Add `parseReturnUri`.
- Add `parseReturnIntent`.
- Return typed statuses:
  - Returned
  - Cancelled
  - Expired
  - Rejected
  - Unknown
  - Error
- Document that return does not confirm payment.
- Add tests/static checks.
