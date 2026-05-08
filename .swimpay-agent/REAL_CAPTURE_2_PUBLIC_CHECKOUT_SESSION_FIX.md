# REAL-CAPTURE-2 Public Checkout Session Fix

generated_at: 2026-05-08T21:14:08+03:00

No real bank notifications were processed.

## Objective

Remove the remaining development-only bearer dependency from the buyer checkout path before SDK/webhook staging rehearsal.

The hosted checkout is a public buyer surface. It must resolve merchant context from the durable `payment_session_id`, not from a `Bearer test_<merchant_id>` header.

## Root Cause

Several buyer checkout API routes still called `parseMerchantId(request.headers.authorization)`.

Affected surfaces:

- `GET /v1/payment-sessions/:id`
- `GET /v1/checkout/:id/receiver-banks`
- `POST /v1/checkout/:id/receiver-bank`
- `GET /v1/checkout/:id/receiver-banks/:bankId/routes`
- `POST /v1/checkout/:id/receiving-route`
- `GET /v1/checkout/:id/receiving-route/copy-details`
- `POST /v1/checkout/:id/buyer-sender-phone`
- `POST /v1/checkout/:id/payer-bank-launcher`
- checkout action mutations including continue-to-bank and claimed-paid

That meant a real buyer following a SDK-created checkout URL could hit 401/403 in staging/production unless a dev merchant bearer leaked into the flow.

## Implementation

- Added `OrderRepository.getCheckoutSessionById(paymentSessionId)`.
- Implemented Postgres lookup from `payment_sessions.id`, then loaded the owning order through its stored `merchant_id`.
- Updated public checkout API routes to derive merchant scope from the payment session.
- Removed dev Authorization header injection from the web checkout client.
- Added a regression test proving buyer checkout progression works without any Authorization header.

## Product Truth Preserved

- No auto-confirmation was added.
- `J'ai paye` still does not confirm payment.
- `continue-to-bank` only arms/advances the receiver flow.
- `payment.confirmed` remains final-only after merchant manual confirmation.
- Public webhook semantics remain unchanged.
- No raw notification text, raw phone/card, account data or secrets were exposed.

## Validation

Commands run:

- `npm test -- apps/api/src/payment-sessions.test.ts`
- `npm test -- apps/api/src/orders.test.ts apps/api/src/payment-sessions.test.ts apps/web/src/checkout.test.ts apps/web/src/developer-wizard.test.ts tests/durable-worker-e2e.test.ts`
- `npm run typecheck`
- `npm run lint`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `npm run android:doctor`
- `npm test`
- `npm run build`

Results:

- Targeted checkout/API/web/worker tests: passed, 53 tests.
- Full Vitest suite: passed, 74 files / 529 tests.
- Typecheck: passed.
- Lint: passed.
- Build: passed.
- Compose config: passed.
- Android doctor: passed.

## Remaining Gates Before Real Notification Capture

- Redeploy staging from `origin/main`.
- Create a staging SDK order using a real staging API key.
- Open hosted checkout without dev Authorization and complete synthetic buyer selection.
- Prove active receiving method + active payment intent.
- Run synthetic redacted signed upload from the installed APK.
- Rehearse merchant manual review.
- Rehearse final-only webhook delivery to the staging external app.
- Ask for the explicit operator capture-start command before any real notification capture.

