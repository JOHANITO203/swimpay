# External App Real Staging Report

generated_at: 2026-05-08T00:00:00+03:00

## Result

Created a minimal external merchant staging app at `examples/real-staging-merchant`.

Endpoints:

- `POST /create-order`
- `GET /orders/:id/status`
- `POST /webhooks/swimpay`

## Safety

- Uses `@swimpay/node` for order creation.
- Uses `WebhooksClient.verify` for webhook signature verification.
- Marks fulfillment only after verified `payment.confirmed`.
- Does not fulfill internal signal/review events.
- Does not use browser or Android secrets.
- Stores only staging in-memory order status.

## Validation Added

Added `tests/real-staging-external-app.test.ts` to guard SDK usage, final-event fulfillment and safe documentation.

## Blocker

The app was not run against a public staging endpoint because `staging.swimpay.pro`, staging API key and webhook secret were not available in this session.
