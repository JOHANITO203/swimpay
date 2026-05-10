# Checkout Method Availability Fix Report

generated_at: 2026-05-10T08:35:00+03:00

## Backend Contract

`GET /v1/payment-sessions/:id` and `GET /v1/checkout/:id/status` can now expose:

```json
{
  "available_payment_methods": {
    "card": true,
    "sbp": false
  },
  "available_routes": [
    {
      "route_id": "route_2",
      "method_type": "card",
      "bank_id": "sber_ru",
      "masked_value": "2202 **** **** 7890",
      "status": "active"
    }
  ],
  "unavailable_reason": "method_not_supported_by_merchant"
}
```

## API Behavior

- Active card route exposes `card=true`.
- Active phone/SBP route exposes `sbp=true`.
- No active checkout-safe route exposes both as false with `merchant_no_active_receiving_method`.
- Certification-blocked routes are not exposed as available checkout methods.
- Forced Expected Payment Profile submission for an unavailable method returns `409 no_receiving_route_for_method`.
- `continue-to-bank` remains blocked without a compatible active selected route.

## Code Paths Updated

- `apps/api/src/payment-sessions.ts`
- `apps/api/src/server.ts`
- `apps/web/src/index.ts`
- `apps/web/src/screens/CheckoutScreen.ts`

## Tests Added / Updated

- Backend availability matrix for card+SBP, card-only and no-route states.
- Certification-blocked route availability test.
- Updated forced-method rejection payload with `available_payment_methods`.
- Frontend tests for card-only, SBP-only, no-route and stale-method fallback.

## Validation

- `npm run android:doctor` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 77 files, 608 tests.
- `npm run build` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` passed.
- Android source was not touched, so Android Gradle tests/builds were not required.

## Safety

The change is route/method availability only. It does not change `payment.confirmed`, auto-confirmation, webhook delivery or Receiver behavior.
