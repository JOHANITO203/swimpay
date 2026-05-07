# Sprint 9K - Production-mode Staging Validation Report

Date: 2026-05-07

## 1. Production-mode Inventory

Production-mode boundaries were audited in `.swimpay-agent/PROD_MODE_STAGING_INVENTORY.md`.

Covered and hardened:

- local `Bearer test_*` rejected in production for SDK orders and Receiver register/heartbeat;
- dev BFF bootstrap disabled in production;
- BFF session cookies are HttpOnly and Secure in production;
- CSRF is required for BFF-backed merchant mutations;
- Receiver registration and heartbeat now use authenticated merchant context in production.

## 2. Env / Secret Contract

Created `docs/PRODUCTION_ENVIRONMENT.md`.

Updated safe placeholders in:

- `.env.example`
- `.env.production.example`

No real Google OAuth secret was committed. Local OAuth credentials remain in ignored `.env`.

## 3. Staging Identity Data

Added `scripts/seed-staging-auth-bff.mjs`.

The script is opt-in only and refuses to run unless `SWIMPAY_STAGING_SEED_CONFIRM=seed-local-staging-auth` is provided. Production-mode execution requires an additional explicit staging override.

Synthetic seed output includes:

- staging user;
- staging merchant;
- owner membership;
- hashed API key row;
- BFF session hash;
- CSRF hash.

## 4. BFF Session / CSRF Validation

Tests validate:

- `/auth/dev/bootstrap-session` is disabled in production;
- `/v1/me` requires a valid BFF session;
- production session cookie is `HttpOnly` and `Secure`;
- BFF-backed merchant mutation requires CSRF;
- Receiver registration requires BFF session + CSRF in production.

## 5. SDK API Key Validation

Tests validate:

- stored hashed API key can create an order in production mode;
- local `Bearer test_*` key is rejected in production;
- `auto_confirm` and `autoConfirm` are rejected at order creation;
- API key value is not echoed in responses.

## 6. Receiver Registration / Heartbeat Validation

Tests validate:

- production local `Bearer test_*` receiver registration fails closed;
- production BFF session + CSRF can register a receiver;
- registered receiver heartbeat returns safe operational state;
- receiver public key is not returned in the API response.

## 7. Signal Upload Validation

Existing production signal tests remain in force:

- stale `observed_at` rejected in production mode;
- raw notification flags rejected;
- duplicate `event_id` rejected;
- duplicate `notification_hash` rejected;
- local counter regression rejected;
- inactive/revoked/action-required receivers rejected.

No real bank notification was captured or uploaded.

## 8. Webhook Semantics Validation

Existing SDK/product-truth guardrails remain in force:

- public fulfillment webhooks are limited to `payment.confirmed`, `payment.rejected`, `payment.expired`;
- internal signal/review events are not public fulfillment events;
- `official_bank_confirmation=false` remains required;
- test webhooks are backend-owned and test-only.

## 9. VPS Staging Readiness

Created `.swimpay-agent/VPS_STAGING_READINESS_AUDIT.md`.

Staging is plausible, but not public-production ready until:

- real HTTPS/OAuth redirect is configured;
- migration and backup/restore runbook is rehearsed;
- secrets are injected from the VPS environment or a secret store;
- production-mode staging smokes are run on synthetic data.

## 10. Commands Run

Initial focused validation:

- `npx vitest run apps/api/src/auth-bff.test.ts apps/api/src/receiver-devices.test.ts`
- `npx vitest run tests/prod-mode-staging-guardrails.test.ts apps/api/src/auth-bff.test.ts apps/api/src/receiver-devices.test.ts`

Full validation:

- `npm run android:doctor` - passed
- `npm run typecheck` - passed after fixing the staging test type
- `npm run lint` - passed
- `npm test` - passed: 69 files, 488 tests
- `npm run build` - passed
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - passed
- `COMPOSE_PARALLEL_LIMIT=1 docker compose --env-file .env.example -f infra/docker-compose.yml build swimpay-api swimpay-web swimpay-signal-worker swimpay-job-worker proxy` - passed
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --no-build` - passed
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - passed; services healthy after proxy warm-up
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` - passed; database, NATS and Valkey `ok`

Note: live Compose uses `.env.example`, so `/api-health` correctly reports `environment=development`. Production-mode behavior was validated with in-process production-mode tests and the committed staging runbook, not by using real production secrets.

## 11. Blockers

No critical code blocker identified so far.

Remaining non-critical limitations:

- Google OAuth is still a fail-closed provider seam; live token exchange remains follow-up.
- VPS production-mode staging was not executed against real server secrets in this sprint.
- Full legacy merchant route BFF migration remains follow-up.

## 12. Next Sprint Recommendation

Sprint 9L should run production-mode staging on the VPS with synthetic data only:

1. provision HTTPS staging hostname;
2. inject OAuth/env secrets outside git;
3. run migrations;
4. run `scripts/seed-staging-auth-bff.mjs`;
5. smoke BFF `/v1/me`, SDK order creation, Receiver registration/heartbeat and signed synthetic signal upload through the staging URL.
