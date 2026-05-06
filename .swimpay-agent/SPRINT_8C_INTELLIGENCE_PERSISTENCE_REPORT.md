# Sprint 8C - Durable Intelligence Feedback Persistence

## Result

Sprint 8C closed the durable persistence gap for SwimPay Intelligence feedback and unknown-shape monitoring while preserving the review-first, deterministic operating model.

The sprint keeps Intelligence as operational monitoring and supervised learning input only. It does not create payment decisions, does not mutate runtime rules, does not promote bank profiles, does not emit payment webhooks, and does not auto-confirm orders.

## Completed Tasks

- `460_intelligence_persistence_gap_audit`
- `461_durable_intelligence_feedback_storage`
- `462_intelligence_repository_and_apis`
- `463_operator_intelligence_readonly_surfaces`
- `464_intent_bound_learning_contract_guardrails`
- `465_intelligence_persistence_readonly_tests`
- `466_sprint_8c_intelligence_persistence_closeout`

## Durable Persistence

Sprint 8C added durable PostgreSQL-backed state for passive Intelligence feedback and unknown-shape monitoring.

The durable records are constrained to safe metadata:

- redacted placeholders and shape hashes;
- bank/profile/package identifiers that are safe for operator monitoring;
- intent-bound learning metadata and relation fields;
- counters, timestamps, reason codes, and review status;
- explicit non-mutating safety flags.

The records must not store raw notification title, body, text, raw phone, raw card, SMS content, bank credentials, or unredacted buyer PII.

## Repository and API Boundary

The repository/API layer keeps the existing feedback and unknown-shape paths available while adding read-only admin monitoring for operators.

Operational boundary:

- `POST /v1/intelligence/feedback` accepts passive feedback only;
- `GET /v1/intelligence/unknown-shapes` remains monitoring-only;
- `GET /v1/admin/intelligence/feedback` exposes read-only operator feedback monitoring;
- `GET /v1/admin/intelligence/unknown-shapes` exposes read-only operator unknown-shape monitoring;
- admin Intelligence endpoints are read-only;
- feedback alone does not create a merchant review;
- unknown-shape observation alone does not create a merchant review;
- no merchant payment webhook is emitted by feedback persistence.

Implementation notes:

- added `packages/database/migrations/008_intelligence_feedback.sql`;
- added an `IntelligenceRepository` seam with PostgreSQL persistence and local/test fallback;
- production without `DATABASE_URL` now reports repository unavailability for Intelligence endpoints instead of constructing unsafe durable state;
- unknown-shape counts upsert by merchant, shape, profile and package.

## Operator Surfaces

The operator Intelligence surface is read-only and intended for monitoring, audit, and supervised diagnosis.

It may show safe summaries of feedback and unknown shapes, but it must not include mutation controls, raw notification text, raw PII, production trust controls, profile-promotion controls, or payment confirmation actions.

## Contract Guardrails

Sprint 8C preserves explicit guardrails on durable Intelligence records:

- `official_bank_confirmation=false`;
- `mutates_runtime_rules=false`;
- `promotes_profile=false`;
- `auto_confirm_allowed=false`;
- feedback remains separated from payment decision logic;
- unknown shapes remain read-only observations.

Public payment-signal semantics remain notification-signal semantics, not official bank confirmation semantics.

## Validation

Implementation tasks for Sprint 8C added/updated tests for:

- durable unknown-shape count behavior;
- read-only admin monitoring APIs;
- safe operator UI rendering;
- contract flags for feedback and unknown-shape records;
- no raw sensitive fields in contract/API/UI responses;
- no review creation or webhook side effect from feedback alone.

Commands run:

- `npm run android:doctor` passed.
- `npm run typecheck` passed after rerunning sequentially with `NODE_OPTIONS=--max-old-space-size=4096`.
- `npm run lint` passed.
- `npm test -- --maxWorkers=2 --minWorkers=1` passed: 59 files, 412 tests.
- `npm run build` passed after rerunning sequentially with `NODE_OPTIONS=--max-old-space-size=4096`.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` passed.
- `docker version` passed after Docker Desktop was resumed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` passed after rebuilding/restarting `swimpay-api` and `proxy`; Postgres, Valkey, NATS, API, web and proxy were healthy.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` passed with HTTP 200 and database, NATS and Valkey reported `ok`.
- The local Postgres volume predated migration `008`; `packages/database/migrations/008_intelligence_feedback.sql` was applied manually through `psql` as an additive local-volume migration.
- `POST http://localhost:8080/v1/intelligence/feedback` passed and wrote a safe redacted feedback record to PostgreSQL.
- `GET http://localhost:8080/v1/intelligence/unknown-shapes` passed and returned read-only monitoring flags.
- `GET http://localhost:8080/v1/admin/intelligence/feedback` passed with the `.env.example` local admin token and returned read-only operator feedback data.
- `GET http://localhost:8080/v1/admin/intelligence/unknown-shapes` passed with the `.env.example` local admin token and returned read-only unknown-shape monitoring.
- `adb devices -l` passed via local SDK ADB and detected Samsung `SM_S916B` / `R5CWA0FEPZW`.

## Safety Confirmation

No real bank notifications were processed during this closeout.

No LLM decisioning, SMS reading, bank app scraping, Accessibility scraping, raw notification storage, runtime rule mutation, bank profile promotion, PSP/SBP behavior, or auto-confirmation was added by this closeout.

Android remains capture/filter/extract/redact/sign/upload only. Backend remains the decision owner.

## Remaining Follow-up

Future work should remain supervised and docs/task scoped unless explicitly opened:

- operator export/reporting for redacted Intelligence monitoring;
- retention-policy documentation for durable Intelligence records;
- operational dashboard metrics for feedback volume and unknown-shape trends.

All future work must keep the same safety posture: no LLM, no auto-confirm, no raw notification text/PII, and no runtime rule mutation.
