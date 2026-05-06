# Task 478 - Orders create helper

Sprint: 9B - SDK Web Production Readiness

Goal:
Implement `swimpay.orders.create(input, options)`.

Acceptance:
- Validate `amountMinor` as a positive integer.
- Validate currency as uppercase ISO-like code.
- Reject dangerous fields such as `auto_confirm`, `autoConfirm`, CVV and expiry.
- Send an authenticated server-side order creation request.
- Support `Idempotency-Key`.
- Return typed `orderId`, `paymentSessionId`, `checkoutUrl`, `status` and optional `expiresAt`.
- Add tests first.

Safety:
- Do not accept auto-confirmation flags.
- Do not include raw card/CVV/expiry fields in create-order payloads.
