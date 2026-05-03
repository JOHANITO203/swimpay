# Task 348 - PSP-like Checkout E2E Tests

## Goal

Add synthetic E2E coverage for the PSP-like checkout flow.

## Required Scenarios

- Buyer selects receiver bank.
- Buyer selects payer launcher.
- Buyer views payment instructions.
- Buyer clicks "I paid".
- Synthetic signal routes to review.
- Manual confirm sends webhook.
- Confirmed status appears after manual review.
- Expired flow works.

## Requirements

- Use synthetic merchant/order/signal fixtures only.
- Do not process real bank notifications.
- Do not use real customer data.
- Assert all buyer-facing wording is safe.
- Assert webhook disclosure includes `official_bank_confirmation=false` and `confirmation_type=notification_signal`.
- Assert payer launcher selection does not affect matching or trust.

## Safety Notes

- No real notification samples.
- No auto-confirm for real banks.
- No raw phone or raw notification text.
