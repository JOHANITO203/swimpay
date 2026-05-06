# Task 476 - SDK Web package inventory

Sprint: 9B - SDK Web Production Readiness

Goal:
Audit current SDK, order, checkout and webhook helper surfaces before adding the production Node/Web SDK.

Scope:
- SDK Web / Node only.
- No payment runtime behavior changes.
- No Android SDK or notification processing changes.

Acceptance:
- Identify current package conventions.
- Identify order creation and webhook signing primitives.
- Decide the SDK package location.
- Create `.swimpay-agent/SDK_WEB_PACKAGE_INVENTORY.md`.

Safety:
- Do not enable auto-confirmation.
- Do not expose raw PII.
- Do not publish internal `payment.signal_detected` or `payment.needs_review` as fulfillment webhook events.
