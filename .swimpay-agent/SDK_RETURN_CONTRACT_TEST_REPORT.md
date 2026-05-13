# SDK Return Contract Test Report

## Tests Added / Updated

- Android native scheme wins over stored web `return_url`.
- `android_return_scheme` alias is accepted.
- Stored web `return_url` is used when no native scheme is provided.
- Native return includes `external_id`.
- Checkout/payment-session public responses expose `external_id`.
- `web_return_url` is accepted as a safe web fallback alias.
- Android SDK docs state that return does not confirm payment and the backend must refresh/fulfill only after webhook.

## Validation

Passed:

```text
npm test -- apps/web/src/checkout.test.ts apps/api/src/payment-sessions.test.ts apps/api/src/orders.test.ts tests/sdk-android-product-truth.test.ts
npm run typecheck
npm run lint
npm test
npm run build
docker compose --env-file .env.example -f infra/docker-compose.yml config
```

## Safety

No payment runtime semantics changed. No auto-confirmation was added. No public webhook behavior changed. Android return remains a navigation hint only.
