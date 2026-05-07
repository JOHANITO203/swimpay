# SwimPay Real Staging Merchant App

Minimal external merchant app for the real staging integration test.

It intentionally keeps state in memory and is suitable only for operator-controlled staging smoke.

## Environment

```text
SWIMPAY_STAGING_API_BASE_URL=https://staging.swimpay.pro
SWIMPAY_STAGING_SECRET_KEY=sk_staging_...
SWIMPAY_STAGING_WEBHOOK_SECRET=whsec_staging_...
EXTERNAL_APP_BASE_URL=https://<merchant-staging-endpoint>
PORT=4105
```

Do not commit real values.

## Endpoints

- `POST /create-order`
- `GET /orders/:id/status`
- `POST /webhooks/swimpay`

The app marks an order fulfilled only after a verified `payment.confirmed` webhook with `official_bank_confirmation=false`.
