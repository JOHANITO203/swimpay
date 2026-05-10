# Checkout External App Breakage Audit

generated_at: 2026-05-10T12:02:00+03:00

## Problem

After the payment compatibility and route readiness refactors, an external app could no longer reliably launch a hosted checkout URL.

The likely failure class is not a browser rendering change. The current runtime code reads and writes schema added by recent additive migrations. Dokploy redeploys code, but PostgreSQL does not replay `/docker-entrypoint-initdb.d` migrations on an existing data volume.

## Git And Deployment State

Local `HEAD` and `origin/main` were aligned before this hotfix:

```text
31081fabb025b35366249000d2a527d4cd82eb9a
```

Staging API health was reachable:

```json
{
  "service": "swimpay-api",
  "version": "0.1.0",
  "environment": "production",
  "dependencies": {
    "database": "ok",
    "nats": "ok",
    "valkey": "ok"
  }
}
```

Health does not prove schema compatibility. It only proves the process and dependencies are reachable.

Health was checked again after the hotfix implementation and remained reachable with `database=ok`, `nats=ok` and `valkey=ok`.

## Recent Schema Dependencies

The current checkout/order/runtime code depends on schema from:

- `014_expected_payment_profile.sql`;
- `015_no_notification_fallback_and_ozon_bank.sql`;
- `016_p0_delta_hardening.sql`;
- `017_receiving_route_readiness_lock.sql`.

Critical runtime dependencies include:

- `amount_leases`;
- `bank_route_certifications`;
- `worker_idempotency_ledger`;
- `payment_sessions.payment_method`;
- `payment_sessions.sender_bank_id`;
- `payment_sessions.payable_amount_minor`;
- `payment_sessions.reconciliation_delta_minor`;
- `payment_sessions.receiver_armed_at`;
- `payment_sessions.route_locked_at`;
- `payment_sessions.route_lock_expires_at`;
- `payment_sessions.amount_lease_id`;
- `merchant_receiving_routes.lifecycle_status`;
- `merchant_receiving_routes.revoked_at`.

If any of these are absent on staging, checkout creation/opening can fail after redeploy.

## External SDK Reproduction Status

Not executed locally against staging because no staging SDK secret key was present in the local environment.

Observed local environment:

- `SWIMPAY_STAGING_SECRET_KEY` not set;
- `SWIMPAY_STAGING_WEBHOOK_SECRET` not set;
- `EXTERNAL_APP_BASE_URL` not set.

## Root Cause Assessment

Most likely root cause:

```text
code deployed ahead of staging database migrations
```

Secondary issue found:

The example real staging merchant app converted every SDK error into HTTP 500. That made `merchant_payment_setup_required` or other structured SDK errors look like a generic external app failure.

## Fix Summary

- Added `018_checkout_external_flow_reconciliation.sql` to reconcile staging schema dependencies.
- Added guardrail coverage for the migration.
- Preserved structured SDK errors in the real staging external merchant app.
- Added guardrail coverage for structured external app error handling.

## Product Truth Preserved

- No real bank notifications were processed.
- No auto-confirmation was enabled.
- `payment.confirmed` semantics were not changed.
- Public webhooks remain final-only.
- PAN Sensitive Boundary remains active.
- No raw PAN, raw phone, notification text or secrets were exposed.
