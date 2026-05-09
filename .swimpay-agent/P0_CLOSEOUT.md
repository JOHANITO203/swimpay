# P0 External Recommendations Delta Closeout

generated_at: 2026-05-09T23:18:00+03:00

Summary:

- PAN Kill Switch was not applied.
- PAN Sensitive Boundary guardrails were strengthened.
- Evidence envelope metadata is now persisted for receiver uploads.
- Confidence vector and collision pressure are now deterministic matching outputs.
- Amount leases, worker idempotency ledger and bank certification matrix have PostgreSQL foundations.
- Deterministic replay scripts were added.

No payment runtime semantics changed:

- no auto-confirmation;
- no real notification capture;
- no public internal webhooks;
- `payment.confirmed` remains manual-confirmation-only;
- `official_bank_confirmation=false` remains mandatory.

Validation passed:

- `npx vitest run packages/security/src/index.test.ts packages/observability/src/index.test.ts packages/swimpay-node/src/index.test.ts apps/job-worker/src/webhooks.test.ts packages/contracts/src/android-receiver.test.ts packages/matching-core/src/payment-intent-gate.test.ts apps/api/src/signals.test.ts`
- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` - 76 files, 593 tests passed
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `npm run test:replay` - 5 files, 87 tests passed

Android source was not touched in this sprint, so Android Gradle build/test commands were not required.

Deployment note:

- Apply `packages/database/migrations/016_p0_delta_hardening.sql` on staging after redeploy.

Next recommended sprint:

Wire the amount lease allocation and bank certification consumption into checkout route selection, then run the synthetic SDK -> checkout -> manual review -> final webhook rehearsal before any real notification capture.
