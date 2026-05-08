# Task 641 - REAL-CAPTURE-2 SDK order and webhook rehearsal

Status: pending

Goal: prove external app SDK integration and final-only webhook behavior with synthetic/manual staging evidence.

Test:
1. Use `@swimpay/node` to create a staging order.
2. Open or inspect `checkout_url`.
3. Arm receiver through checkout flow where possible.
4. Use synthetic signed signal to create manual review.
5. Manually confirm as merchant/operator.
6. Verify external app receives and verifies `payment.confirmed`.
7. Record timings: order creation, checkout readiness, review latency, manual confirmation to webhook delivery.

Expected:
- External app fulfills only after verified `payment.confirmed`.
- Webhook includes `confirmation_type=notification_signal`.
- Webhook includes `official_bank_confirmation=false`.
- No `payment.signal_detected` or `payment.needs_review` fulfillment webhook is delivered.

Output:
- `.swimpay-agent/REAL_CAPTURE_2_SDK_WEBHOOK_REHEARSAL.md`

Guardrails:
- No SDK public contract changes.
- No auto-confirmation.
