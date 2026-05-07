# Sprint 9I - Live Receiver Validation Report

Date: 2026-05-07

## Scope

Live backend/Android smoke after Sprint 9H, without processing real bank notifications.

This pass did not:

- capture real bank notifications;
- enable auto-confirmation;
- add LLM logic;
- add SMS or Accessibility;
- add broad app enumeration;
- change payment confirmation or webhook semantics.

## Docker / API Health

Docker was running and the local Compose stack was reachable.

Validated:

- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `GET http://localhost:8080/api-health`

Result:

- API, web, signal worker, job worker, Postgres, NATS and Valkey were healthy.
- `/api-health` returned database, NATS and Valkey as `ok`.
- Runtime environment reported by `/api-health`: `development`.

## Live Receiver Registration Smoke

Initial live smoke found a hardening issue:

- a syntactically valid local/dev test bearer with no matching merchant row could trigger a PostgreSQL foreign-key error and return HTTP 500.

Fix:

- receiver registration now maps merchant foreign-key storage failures to the same safe authenticated-merchant error used by the auth gate.
- the response no longer exposes PostgreSQL table names or constraint details.

Regression test:

- `apps/api/src/receiver-devices.test.ts`

Live validation after rebuild:

- invalid local/dev merchant registration returned HTTP 401 with safe `invalid_request` response.
- valid existing local merchant registration returned HTTP 201.

## Live Receiver Heartbeat Smoke

Using a synthetic local/dev receiver registered under the existing local smoke merchant:

- heartbeat with Notification Access enabled;
- listener connected;
- no enabled bank targets.

Result:

- HTTP 200.
- `device_status=bank_targets_missing`.
- `receiver_mode=attention_required`.
- `warnings=["bank_targets_missing"]`.
- `required_actions=["configure_bank_targets"]`.

This confirms the new Sprint 9H health state is live through the proxy.

## Live Signal Upload Safety Smoke

Sent a synthetic/redacted receiver signal attempt with:

- `raw_text_present=true`;
- synthetic hashes;
- no real notification text;
- no real bank notification capture.

Result:

- HTTP 400.
- `error.code=raw_notification_rejected`.
- field: `raw_text_present`.

This confirms the live API rejects raw-notification upload flags before ingestion.

## Production-Specific Smoke Limitation

The local Compose stack currently runs with API environment `development`.

Because of that, the production-only stale/future `observed_at` tolerance gate cannot be honestly validated as a live production behavior through this stack without starting a production-mode API environment.

Covered by tests:

- production local `Bearer test_*` rejection;
- production stale/future `observed_at` rejection before signal ingestion.

Recommended next validation:

- run the same smoke in a production-mode staging stack or VPS once production environment variables and merchant auth are configured.

## Android Device Smoke

Device:

- `R5CWA0FEPZW`
- Samsung `SM-S916B`

Validated:

- ADB device detected;
- `adb reverse tcp:8080 tcp:8080` passed;
- app launch passed;
- UIAutomator dump succeeded.

Observed UI:

- premium Accueil shell;
- `SwimPay Intelligence`;
- local/offline-friendly `Connexion en attente` state;
- bottom navigation `Accueil`, `Revue`, `Ventes`, `Menu`.

No raw phone, card or notification text was observed in the UI dump.

## Additional Build Hardening

The API Docker build exposed that the API image Dockerfile was missing the `packages/bank-templates` workspace after cache invalidation.

Fix:

- `apps/api/Dockerfile` now copies `packages/bank-templates` package metadata, source and built dist into the API image.

## Commands Run

- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health`
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- receiver registration live smoke via `POST /v1/receiver-devices/register`
- receiver heartbeat live smoke via `POST /v1/receiver-devices/heartbeat`
- raw notification rejection live smoke via `POST /v1/receiver/signals`
- `npm test -- apps/api/src/receiver-devices.test.ts`
- `npm run build --workspace @swimpay/api`
- `COMPOSE_PARALLEL_LIMIT=1 docker compose --env-file .env.example -f infra/docker-compose.yml build swimpay-api`
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --no-build swimpay-api proxy`
- ADB device, reverse, launch and UIAutomator dump commands.

## Blockers

No critical code blocker remains from this live smoke.

Remaining limitation:

- production-only live behavior still needs a production-mode staging/VPS validation pass.

## Next Recommendation

Sprint 9J should prepare a production-mode staging/VPS validation run:

- production merchant auth/session/API key boundary;
- receiver registration without `test_*` bearers;
- signed signal upload with production timestamp tolerance;
- heartbeat status display from a real registered Receiver;
- no real bank notification capture unless explicit operator consent is recorded.
