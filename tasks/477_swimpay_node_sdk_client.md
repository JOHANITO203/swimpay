# Task 477 - SwimPay Node SDK client

Sprint: 9B - SDK Web Production Readiness

Goal:
Create the production-safe Node SDK client foundation.

Acceptance:
- Add a `SwimPay` client constructor.
- Support `secretKey` and optional `apiBaseUrl`.
- Add a safe request wrapper with timeout support.
- Add typed error foundation.
- Add tests first.

Safety:
- Secret keys must never be exposed in frontend/browser examples.
- Errors must not include secret keys, webhook secrets or Authorization headers.
