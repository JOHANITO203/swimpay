# P0-WIRE-1 Closeout

generated_at: 2026-05-10T00:03:15+03:00

## Summary

P0 runtime wiring is implemented locally:

1. Amount leases are allocated during checkout route selection.
2. Bank route certification gates are consumed by checkout and signal matching.
3. Worker idempotency ledger wraps webhook delivery and no-notification fallback side effects.
4. Migration `016_p0_delta_hardening.sql` exists locally and has already been applied on the VPS by the operator.

## Amount Lease Result

Checkout now reserves an exact payable amount per active merchant route/rail, using `display_amount_minor + reconciliation_delta_minor`. Manual confirmation marks the lease used; rejection releases it.

## Bank Certification Result

Checkout requires certified/observed/experimental/review-only certification rows before exposing receiving routes. Signal runtime blocks package-validation-pending and disabled certifications before review creation.

## Worker Idempotency Result

Webhook delivery and no-notification fallback now use durable idempotency keys to avoid duplicate side effects across retries and stale processing recovery.

## Migration Readiness

Local migration:

```bash
packages/database/migrations/016_p0_delta_hardening.sql
```

VPS command:

```bash
cd /etc/dokploy/compose/swimpay-swimpay-merchant-usjsm2/code
sudo docker exec -i swimpay-postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < packages/database/migrations/016_p0_delta_hardening.sql
```

Operator already reported successful application of this migration on staging.

## Validation Status

Full validation passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npx vitest run apps/api/src/payment-sessions.test.ts apps/api/src/reviews.test.ts`
- `npx vitest run apps/signal-worker/src/runtime.test.ts`
- `npx vitest run apps/job-worker/src/idempotency-ledger.test.ts apps/job-worker/src/webhooks.test.ts apps/job-worker/src/no-notification-fallback.test.ts`
- `npm test` - 77 files, 599 tests passed
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `npm run test:replay` - 5 files, 88 tests passed
- `npm run test:matching` - 2 files, 34 tests passed
- `npm run test:privacy` - 4 files, 58 tests passed
- `npm run test:webhooks` - 2 files, 45 tests passed

Android source was not touched in P0-WIRE-1, so Android Gradle tests/builds were not required for this sprint.

## Blockers

No code blocker is known for SDK/checkout/manual-review/webhook rehearsal after this wiring. Rehearsal should still wait for staging redeploy of this commit and a healthy `/api-health`.

Real bank notification capture remains gated and was not started.
