# Route Readiness, Reservation And Soft Disable Report

Date: 2026-05-10

## Summary

Implemented checkout protections to reduce dead-end buyer flows when merchant receiving routes disappear or change during checkout.

The backend remains the source of truth. Android Receiver, payment confirmation semantics, webhooks and real notification capture were not changed.

## Implemented

- Added additive migration `017_receiving_route_readiness_lock.sql`.
- Added route lifecycle states: `active`, `pending_disable`, `disabled`, `revoked`, `deleted`.
- Added payment session route lock fields: `route_locked_at`, `route_lock_expires_at`, `amount_lease_id`.
- Checkout availability now exposes only active routes for new sessions.
- Step 2 locks the selected route by persisting the locked route, lock expiry and allocated amount lease with the payment session.
- Step 3 validates the locked route instead of recomputing freely.
- Normal disable behavior: active locks present becomes `pending_disable`; no active locks becomes `disabled`.
- Explicit dangerous revoke behavior: route becomes `revoked`, route is blocked immediately, and a reason is required.
- `pending_disable` routes are hidden from new checkouts but remain usable by already locked sessions.
- Confirmation, rejection and expiration release the route lock and the amount lease.

## Checkout Behavior

- No active route: checkout is unavailable before Step 1.
- Route disabled before Step 2 lock: buyer receives a structured fallback.
- Route locked at Step 2, then merchant disables: buyer can continue on the locked route.
- Route revoked after Step 2: `continue-to-bank` is blocked with a structured fallback.
- `receiver_armed` cannot happen without a compatible route that is still valid for the session.

## Security And Product Truth

- No auto-confirmation was enabled.
- `payment.confirmed` still requires merchant manual confirmation.
- No public webhook semantics changed.
- No raw PAN, raw phone, raw notification text or secrets were exposed.
- No real bank notifications were processed.

## Validation

- `npm run android:doctor` - passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm test` - passed, 77 files / 614 tests.
- `npm run build` - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - passed.
- `npm run test:replay` - passed.
- `npm run test:matching` - passed.
- `npm run test:privacy` - passed.
- `npm run test:webhooks` - passed.

Android source was not touched, so Gradle was not run.

## Staging Migration

Apply on VPS from the deployed repo root:

```bash
cd /etc/dokploy/compose/swimpay-swimpay-merchant-usjsm2/code
sudo docker exec -i swimpay-postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < packages/database/migrations/017_receiving_route_readiness_lock.sql
```

## Next Step

After commit, push and Dokploy redeploy, re-test SWIMVPN+ hosted checkout:

- merchant with no active route is blocked before Step 1;
- card-only merchant shows only card;
- SBP-only merchant shows only SBP / telephone;
- disabling a route after instructions keeps the locked checkout alive as `pending_disable`;
- revoking a route blocks `continue-to-bank` cleanly.
