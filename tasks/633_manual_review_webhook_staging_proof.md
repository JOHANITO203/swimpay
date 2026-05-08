# Task 633 - Manual review webhook staging proof

Status: blocked_until_safe_signal_and_manual_review

Goal: after a safe signal exists, prove manual merchant confirmation and final-only webhook fulfillment.

Scope:
- Create active payment intent through the external staging app.
- Capture one allowed signal after operator gate.
- Create manual review only.
- Merchant manually confirms.
- Deliver `payment.confirmed` only after manual confirmation.

Guardrails:
- `official_bank_confirmation=false`.
- `confirmation_type=notification_signal`.
- No internal signal/review fulfillment webhooks.
