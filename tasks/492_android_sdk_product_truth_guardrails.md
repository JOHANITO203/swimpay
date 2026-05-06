# Task 492 - Android SDK product truth guardrails

Sprint: 9C - Android Merchant SDK / Helper Production Readiness

Goal:
Protect Android SDK docs/examples from unsafe V1 product claims.

Acceptance:
- Static checks for:
  - no secret key in Android code;
  - no webhook handling in Android app;
  - no local fulfillment on return;
  - no auto-confirmation fields;
  - no official bank confirmation claim;
  - no CVV or expiry fields;
  - no `J'ai paye` as payment confirmation.
