# Staging Migration Reconciliation Report

generated_at: 2026-05-10T12:02:00+03:00

## Summary

Created additive idempotent migration:

```text
packages/database/migrations/018_checkout_external_flow_reconciliation.sql
```

This migration is designed for staging databases that received recent checkout runtime code before all additive schema migrations were manually applied.

## What It Reconciles

The migration ensures current checkout runtime dependencies exist:

- Expected Payment Profile fields on `payment_sessions`;
- route selection fields;
- no-notification fallback fields;
- redacted signal evidence fields;
- confidence vector fields;
- `amount_leases`;
- `worker_idempotency_ledger`;
- `bank_route_certifications`;
- receiving route lifecycle fields;
- route lock fields;
- `payment_sessions.amount_lease_id`.

It also seeds bank route certification defaults for the five V1 banks and keeps Ozon Bank package-validation-pending.

## What It Does Not Do

- Does not drop data.
- Does not rewrite historical sessions.
- Does not disable amount leases.
- Does not bypass bank certification.
- Does not create official bank confirmation semantics.
- Does not enable auto-confirmation.

## VPS Command

Run from the deployed repo root on the VPS after the new code is synced:

```bash
cd /etc/dokploy/compose/swimpay-swimpay-merchant-usjsm2/code
sudo docker exec -i swimpay-postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < packages/database/migrations/018_checkout_external_flow_reconciliation.sql
```

## Safe Introspection Queries

Tables:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'amount_leases',
  'bank_route_certifications',
  'worker_idempotency_ledger',
  'expected_payment_profiles'
);
```

Payment session columns:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'payment_sessions'
AND column_name IN (
  'amount_lease_id',
  'selected_receiving_route_id',
  'receiving_route_id',
  'receiver_bank_id',
  'sender_bank_id',
  'payer_bank_launcher_id',
  'compatibility_pair_id',
  'payable_amount_minor',
  'reconciliation_delta_minor',
  'route_locked_at',
  'route_lock_expires_at'
);
```

Receiving route lifecycle:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'merchant_receiving_routes'
AND column_name IN (
  'lifecycle_status',
  'pending_disable_at',
  'disabled_at',
  'revoked_at',
  'revocation_reason',
  'deleted_at'
);
```

Note: SwimPay currently persists the Expected Payment Profile on `payment_sessions`; there is no required dedicated `expected_payment_profiles` table in the current code path.

## Guardrail

Added a deployment test that fails if the reconciliation migration is removed or loses required runtime schema dependencies.

## Validation Result

The migration is covered by `tests/deployment-compose.test.ts` and passed the full local validation suite on 2026-05-10.
