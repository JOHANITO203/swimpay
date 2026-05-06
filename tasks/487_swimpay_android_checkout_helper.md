# Task 487 - SwimPay Android checkout helper

Sprint: 9C - Android Merchant SDK / Helper Production Readiness

Goal:
Implement a minimal checkout-opening helper for merchant Android apps.

Acceptance:
- Provide `SwimPayCheckout.open`.
- Provide `SwimPayCheckout.createIntent`.
- Validate checkout URL.
- Allow only `http` and `https` URLs.
- Prefer Custom Tabs intent extras when feasible.
- Fallback to `ACTION_VIEW` browser intent.
- Return safe typed errors if opening fails.
- Add tests/static checks.

Safety:
- No secret key logic.
- No Receiver internals.
- No NotificationListener usage.
