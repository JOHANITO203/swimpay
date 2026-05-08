# Task 631 - Staging receiver heartbeat and signal upload smoke

Status: blocked_until_receiver_webhook_configured

Goal: prove staging receiver heartbeat and safe signed redacted signal upload without real bank notification capture.

Scope:
- Use synthetic/redacted staging smoke only.
- Confirm backend accepts signed redacted signal.
- Confirm no `payment.confirmed` is emitted from upload alone.

Guardrails:
- No raw notification text.
- No real bank notification capture.
- No auto-confirmation.
