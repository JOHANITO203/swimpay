# Task 481 - SDK errors and idempotency ergonomics

Sprint: 9B - SDK Web Production Readiness

Goal:
Add production-useful SDK errors and make idempotency easy.

Acceptance:
- Implement:
  - `SwimPayError`
  - `SwimPayApiError`
  - `SwimPayValidationError`
  - `SwimPayWebhookSignatureError`
  - `SwimPayWebhookTimestampError`
  - `SwimPayNetworkError`
  - `SwimPayTimeoutError`
- Include safe `code`, `message`, optional `statusCode`, `requestId` and safe details.
- Ensure secrets and Authorization headers are never included in errors.
- Document `options.idempotencyKey`.
- Add tests first.
