# Checkout Final State Test Report

generated_at: 2026-05-12T23:45:00+03:00

## Added / Updated Tests

- `packages/contracts/src/checkout.test.ts`
  - Verifies `BuyerSafeCheckoutStatuses` includes `rejected`.
  - Verifies `mapCheckoutStateToBuyerSafeStatus('rejected') === 'rejected'`.

- `apps/api/src/payment-sessions.test.ts`
  - Verifies `/v1/checkout/:id/status` exposes merchant manual confirmation as:
    - `status=manual_confirmed`;
    - `checkout_state=confirmed`;
    - `buyer_safe_status=confirmed`;
    - `official_bank_confirmation=false`.
  - Verifies merchant rejection is exposed as:
    - `checkout_state=rejected`;
    - `buyer_safe_status=rejected`.
  - Verifies the status response is not cacheable.

- `apps/web/src/checkout.test.ts`
  - Verifies hosted `/checkout/:id/status` is not cacheable.
  - Verifies waiting screen emits a status polling URL.
  - Verifies waiting screen script polls status and stops/reloads on final buyer states.
  - Verifies rejected state renders as rejected.
  - Verifies no `payment.confirmed` browser dependency and no official confirmation wording.

## Targeted Validation

Command:

```bash
npm test -- packages/contracts/src/checkout.test.ts apps/web/src/checkout.test.ts apps/api/src/payment-sessions.test.ts
```

Result:

- 3 test files passed.
- 87 tests passed.

## Full Validation

Commands:

```bash
npm run android:doctor
npm run typecheck
npm run lint
npm test
npm run build
docker compose --env-file .env.example -f infra/docker-compose.yml config
npm run checkout:screenshot:verify
```

Results:

- Android toolchain check: ready for wrapper builds.
- TypeScript typecheck: passed.
- ESLint: passed.
- Full Vitest suite: 78 files passed, 678 tests passed.
- TypeScript build: passed.
- Docker Compose config: rendered successfully.
- Checkout screenshot verify: completed for 5 baselines.

## Security / Product Checks

- `J'ai payé` remains non-confirming.
- `signal_detected` remains non-confirming.
- Buyer checkout shows confirmed only after backend final state.
- No public webhook is required by the buyer browser.
- `official_bank_confirmation=false` remains enforced in tested status payloads.
