# Task 479 - Webhook verifier

Sprint: 9B - SDK Web Production Readiness

Goal:
Implement `swimpay.webhooks.verify(rawBody, headers, webhookSecret)`.

Acceptance:
- Verify `SwimPay-Signature`, `SwimPay-Timestamp` and `SwimPay-Event-Id`.
- Use the repository signing method: HMAC-SHA256 over `timestamp.rawPayload`.
- Use constant-time comparison.
- Reject missing/invalid/stale signatures and malformed payloads.
- Return typed public webhook events.
- Add tests first.

Safety:
- Verification must require raw body.
- Errors must not expose the webhook secret or raw PII payload.
