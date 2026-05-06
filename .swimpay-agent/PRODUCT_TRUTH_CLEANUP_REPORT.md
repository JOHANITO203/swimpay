# Product Truth Cleanup Report

generated_at: 2026-05-06

## Scope

Cleaned SDK-facing product truth documentation and added guardrail tests.

No backend API implementation, payment runtime behavior, Android notification processing, workers, database schema or contract code was changed.

## Completed

1. Public webhook taxonomy cleanup
   - `docs/12_WEBHOOKS.md` now presents V1 public webhooks as post-review/terminal outcomes:
     - `payment.confirmed`
     - `payment.rejected`
     - `payment.expired`
   - Signal detected, matching and review-needed concepts are documented as internal/non-fulfillment states.
   - `payment.confirmed` example uses `decision=manual_confirmed`.

2. API spec payment-intent alignment
   - `docs/06_API_SPEC.md` no longer shows an `auto_confirm` order field.
   - Order creation now starts from `payment_session_created`.
   - `continue-to-bank` documents Receiver arming.
   - `claimed-paid` documents non-confirming buyer claim behavior.
   - Webhook endpoint example now uses only public V1 events.

3. Product/runtime docs cleanup
   - `docs/01_PRODUCT_REQUIREMENTS.md` now states V1 manual confirmation explicitly.
   - `docs/SIGNAL_RUNTIME_PIPELINE.md` now describes the payment-intent-bound flow and manual-confirmation-first V1 behavior.

4. Guardrail tests
   - Added `tests/product-truth-docs.test.ts`.
   - The test protects SDK-facing docs from:
     - public `payment.signal_detected`;
     - public `payment.needs_review`;
     - `auto_confirm` order examples;
     - `decision=auto_confirmed` in public webhook docs;
     - `official_bank_confirmation=true`.

## Validation

Passed:

- `npx vitest run tests/product-truth-docs.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm test` - 60 files / 414 tests passed
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`

Blocked:

- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` could not connect to the Docker Desktop Linux engine pipe.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` failed because no local API server was reachable.

Android:

- Android source was not changed in this sprint, so Gradle/APK validation was not rerun for this docs/test cleanup.

## Remaining Limits

- Broader architecture docs still contain historical/future auto-confirmation concepts.
- Those should be reviewed in a follow-up documentation pass and either clearly marked future-only or removed from public V1 material.
- Runtime code was intentionally not changed in this cleanup sprint.

## Next Recommended Sprint

Start SDK Web production readiness:

1. package or expose Node/Web helpers;
2. webhook signature verifier;
3. typed webhook event parsing;
4. create-order helper;
5. production auth boundary audit;
6. examples for server-side integration.
