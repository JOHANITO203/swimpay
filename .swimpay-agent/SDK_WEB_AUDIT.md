# SDK Web Audit

generated_at: 2026-05-06

## Result

Status: partially ready / no packaged SDK yet.

The backend and docs provide enough primitives to build a merchant integration manually, but the repository does not currently expose a production-grade Node/Web SDK package.

## Present

- Server-side order creation route exists: `POST /v1/orders`.
- Order creation returns a `checkout_url`.
- Hosted checkout exists in `apps/web`.
- Webhook delivery worker exists in `apps/job-worker/src/webhooks.ts`.
- Webhook signatures use `SwimPay-Signature` and `SwimPay-Timestamp`.
- Webhook signing and verification tests exist in worker and e2e tests.
- Security package has API key and webhook secret hashing primitives.
- Docs cover merchant flow, redirect to checkout, webhook verification and release-after-confirmation guidance.
- Idempotency is present in some worker/webhook paths.
- Webhook payloads consistently include `official_bank_confirmation=false` in contract examples/tests where current code is aligned.

## Missing or Not Production-ready

- No dedicated `@swimpay/sdk-node` or `@swimpay/web-sdk` package was found.
- No exported merchant SDK helper for:
  - create order/payment intent;
  - construct checkout URL;
  - verify webhook signature;
  - typed webhook event parsing;
  - typed SDK errors;
  - idempotency-key helpers.
- Merchant API auth is still largely local/dev style in API routes, for example `Authorization: Bearer test_<merchant_id>`.
- Production API key validation using hashed keys is implemented as a primitive but not consistently wired as the merchant auth boundary.
- The webhook docs describe public `payment.signal_detected` and `payment.needs_review` events, which conflicts with the latest product direction if public webhooks must fire only after manual merchant confirmation.
- `docs/06_API_SPEC.md` still contains `auto_confirm: true` in an order example.
- No single production quickstart exists that clearly separates:
  - merchant backend secret use;
  - buyer frontend checkout redirect;
  - webhook verification;
  - Android app no-secret pattern.

## Expected V1 Gap

The SDK Web production sprint should create a small package or documented helper set with:

- `createOrder`
- `createCheckoutUrl` or checkout URL response typing
- `verifyWebhookSignature`
- webhook event discriminated unions
- idempotency helpers
- safe error classes
- examples for Express/Fastify/Next.js backend handlers

It must also update docs so only final post-manual-confirmation public webhooks are recommended for fulfillment.

