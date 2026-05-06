# Task 489 - Android SDK errors and models

Sprint: 9C - Android Merchant SDK / Helper Production Readiness

Goal:
Add typed Android SDK models and safe errors.

Acceptance:
- Add:
  - `SwimPayCheckoutResult`
  - `SwimPayCheckoutStatus`
  - `SwimPayCheckoutOptions`
  - `SwimPayCheckoutError`
  - `SwimPayEnvironment`
- Ensure errors contain no secrets or PII.
- Add tests/static checks.
