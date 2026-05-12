# External Fulfillment Webhook Rehearsal Report

generated_at: 2026-05-13T00:59:00+03:00

## Implemented

1. Les événements internes `review.confirmed` / `review.rejected` transportent maintenant:
   - `external_id`
   - `amount_minor`
   - `currency`
   - `status`
2. Le worker final webhook accepte les décisions finales `manual_bank_check` et `notification_signal`.
3. `payment.confirmed` et `payment.rejected` publics incluent:
   - `review_id`
   - `order_id`
   - `external_id`
   - `payment_session_id`
   - `amount_minor`
   - `currency`
   - `status`
   - `decision`
   - `confirmation_type=notification_signal`
   - `official_bank_confirmation=false`
4. Le bouton de retour checkout reste indépendant du fulfillment.

## Local Rehearsal

Validated with targeted tests:

```txt
npm test -- apps/api/src/orders.test.ts apps/api/src/payment-sessions.test.ts apps/web/src/checkout.test.ts apps/job-worker/src/webhook-runtime.test.ts apps/api/src/reviews.test.ts packages/swimpay-node/src/index.test.ts
```

Result:

```txt
6 test files passed
159 tests passed
```

## Staging Rehearsal Needed

1. Apply migration `022_checkout_return_url_and_webhook_payload.sql`.
2. Redeploy API, web and job-worker.
3. Configure merchant webhook URL + secret.
4. Create SDK order with `external_id` and `return_url`.
5. Confirm merchant review.
6. Verify:
   - buyer checkout shows confirmed;
   - `Retourner au marchand` opens the configured return URL;
   - external backend receives signed `payment.confirmed`;
   - external backend verifies signature and marks `external_id` paid.
