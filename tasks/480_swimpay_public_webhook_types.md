# Task 480 - Public webhook types

Sprint: 9B - SDK Web Production Readiness

Goal:
Expose stable V1 public webhook event types.

Acceptance:
- Support only:
  - `payment.confirmed`
  - `payment.rejected`
  - `payment.expired`
- Reject public fulfillment parsing for:
  - `payment.signal_detected`
  - `payment.needs_review`
- Normalize safe public event fields to typed camelCase SDK objects.
- Require `officialBankConfirmation` to be false.
- Add tests first.

Safety:
- No raw phone, card, buyer source card or notification text in public SDK webhook events.
