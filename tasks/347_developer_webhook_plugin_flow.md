# Task 347 - Developer Webhook Plugin Flow

## Goal

Document and test the developer plugin integration flow for the PSP-like checkout UX.

## Flow

1. Developer creates an order.
2. Developer redirects buyer to `checkout_url`.
3. Buyer completes manual bank transfer.
4. SwimPay emits `payment.signal_detected` when a notification signal is observed.
5. SwimPay emits `payment.needs_review` when review is required.
6. SwimPay emits `payment.confirmed` only after manual review or a separately controlled release policy.

## Requirements

- Create or update `docs/DEVELOPER_PLUGIN_INTEGRATION.md`.
- Webhook payload examples must include:
  - `confirmation_type: "notification_signal"`
  - `official_bank_confirmation: false`
- No raw phone, raw notification text or secrets in examples.
- Add tests for notification-signal disclosure and no official confirmation claims.

## Safety Notes

- `payment.confirmed` does not mean official bank confirmation.
- Real-bank auto-confirm remains disabled for Sprint 7A.
