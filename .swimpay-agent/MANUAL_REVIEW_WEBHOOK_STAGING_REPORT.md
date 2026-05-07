# Manual Review Webhook Staging Report

generated_at: 2026-05-08T00:00:00+03:00

## Status

Not executed.

## Reason

The flow depends on a reachable staging stack, seeded merchant/API key, external merchant app public endpoint, registered Receiver and real operator-owned bank notification capture.

## Expected Proof When Unblocked

- SDK creates order and returns `checkout_url`.
- Buyer uses hosted checkout and clicks `Continuer vers ma banque`.
- Receiver is armed.
- Real notification creates manual review only.
- No webhook is sent before manual confirmation.
- Merchant manual confirmation emits `payment.confirmed`.
- External app verifies signature and marks fulfilled.
- Event contains `confirmation_type=notification_signal` and `official_bank_confirmation=false`.
