# Checkout External Flow Repair Report

generated_at: 2026-05-10T12:02:00+03:00

## Repair Implemented

1. Added `018_checkout_external_flow_reconciliation.sql`.
2. Added migration guardrail coverage in `tests/deployment-compose.test.ts`.
3. Updated `examples/real-staging-merchant/server.mjs` so SDK API errors are returned as structured external-app responses instead of generic `500`.
4. Added external app guardrail coverage in `tests/real-staging-external-app.test.ts`.

## External App Error Handling

Before:

- all SDK failures returned HTTP 500 with a flattened message.

After:

- `SwimPayApiError` preserves:
  - HTTP status;
  - error code;
  - safe message;
  - safe details;
  - action-required marker for `merchant_payment_setup_required`.

This means if a merchant is not payment-ready, the staging external app can show an action-required setup error instead of pretending the checkout crashed.

## SDK Order Result

Not executed against staging because no staging secret key exists in the local environment.

Expected after migration and redeploy:

- payment-ready merchant: SDK order returns `checkout_url`;
- not-ready merchant: SDK order returns structured `merchant_payment_setup_required`.

## Checkout URL Result

Not executed against staging for the same secret-key reason.

Expected after migration and redeploy:

- `checkout_url` opens without Authorization;
- stale/unavailable sessions render buyer-safe fallback;
- no server crash from missing DB columns.

## Amount Lease Result

Local runtime tests already cover amount lease allocation and route locking.

The new migration ensures the staging database has the required `amount_leases` table and `payment_sessions.amount_lease_id` field.

## Bank Certification Result

The new migration ensures `bank_route_certifications` exists and contains observed defaults for the five V1 banks.

Ozon remains `package_validation_pending`.

## Validation Result

Local validation passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` — 77 files, 621 tests
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `npm run test:replay`
- `npm run test:matching`
- `npm run test:privacy`
- `npm run test:webhooks`
- `git diff --check`

Staging health check passed:

```text
https://staging.swimpay.pro/api-health
database=ok, nats=ok, valkey=ok
```

## Blockers

- Apply migration `018_checkout_external_flow_reconciliation.sql` on the VPS.
- Redeploy staging if Dokploy has not already picked up this commit.
- Re-run SDK order creation from the external app with real staging environment variables.

## Next Step

After applying the migration:

1. create an SDK order from the external app;
2. confirm `checkout_url` is returned;
3. open `checkout_url` without Authorization;
4. complete Step 1 with a configured method;
5. verify no server crash, no auto-confirmation and no webhook before manual merchant decision.
