# Progress Log

## 2026-05-02 - Task 029 durable worker E2E tests

Plan:
- Add an in-process durable E2E harness under `tests/` using local fakes and existing runtime abstractions.
- Cover API order/session creation, receiver signal ingestion, signal runtime decisions, review rejection API semantics, webhook delivery processing and worker-boundary handlers.
- Keep external dependencies mocked or in-memory; do not call external network services or live NATS.
- Add privacy assertions across API responses, runtime events, audit payloads and webhook payloads.
- Update docs and local agent reports after validation.

Guardrails:
- No Android Receiver app logic.
- No production deployment.
- No real bank package/cert verification.
- No PSP, SBP, SMS reading, bank app scraping or official bank confirmation behavior.
- No broad parser/matching changes.

TDD evidence:
- `npm test -- --run tests/durable-worker-e2e.test.ts` failed first on an invalid-envelope expectation that did not match the current JetStream wrapper error text.
- The test assertion was corrected to the existing wrapper behavior: `Invalid JetStream event payload: raw_pii_field_present`.
- `npm test -- --run tests/durable-worker-e2e.test.ts` then passed with 7 tests.

Implementation result:
- Added `tests/durable-worker-e2e.test.ts`.
- Added `docs/DURABLE_WORKER_E2E_TESTS.md`.
- Updated local development and implementation notes.
- Covered API order/session creation, receiver signal ingestion, signal runtime processing, review semantics, webhook delivery, retry/dead behavior, duplicate signal protection and worker-boundary error handling.
- Kept live NATS, live PostgreSQL and external merchant endpoints mocked or in-memory.

Final validation:
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 28 test files and 171 tests passed
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS
- `git diff --check`: PASS

Result:
- Task 029 completed.
- Next task is 030_runtime_observability.

## 2026-05-02 - Task 028 review rejection semantics

Plan:
- Add failing API tests for default signal-scope review rejection, explicit payment-session/order scopes, idempotency, conflict handling and validation.
- Change review rejection so it no longer rejects order/session by default.
- Add database support for storing rejection scope on review actions.
- Update event catalog/docs/state-machine guidance.

TDD evidence:
- `npm test -- --run apps/api/src/reviews.test.ts` failed first because default reject still rejected order/session, scopes were ignored, idempotency returned `review_not_open`, and invalid scope/reason were accepted.
- After implementation, `npm test -- --run apps/api/src/reviews.test.ts` PASS.

Implementation result:
- Added explicit review rejection scopes: `signal`, `payment_session`, and `order`.
- Default rejection scope is now `signal`.
- Signal-scope rejection updates the review and linked signal only.
- Payment-session scope rejects the linked session without rejecting the order.
- Order scope explicitly rejects the order and linked session.
- Same-scope repeated rejection is idempotent-safe.
- Conflicting scope escalation after a resolved rejection returns `review_rejection_scope_conflict`.
- Rejection reasons are constrained to documented reason codes.
- Redacted audit events are written for review action creation, review rejection, signal rejection, and scoped order/session state changes.

Final validation:
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 27 test files and 164 tests passed
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS

Result:
- Task 028 completed.
- Next task is 029_durable_worker_e2e_tests.

## 2026-05-02 - Task 027 signal runtime pipeline

Plan:
- Verify task 026 migration integrity before touching runtime code.
- Add tests first for parser/runtime, matching decisions, review/webhook requests, idempotency and privacy.
- Implement only the `signal.received` runtime path in `swimpay-signal-worker`.
- Keep `signal.verified`, `signal.parsed` and `match.scored` consumers as safe stubs for later tasks.

Migration integrity preflight:
- Inspected `packages/database/migrations/001_initial_schema.sql` diff from task 026.
- The task 026 edits were additive/alignment changes for webhook delivery fields and indexes, mirrored by migration `002_webhook_delivery_loop.sql`.
- No destructive table drop, documentation deletion, raw PII column, or unsafe payment state change was found.

Implementation notes:
- Added `apps/signal-worker/src/runtime.ts` with a deterministic signal processor, in-memory test repository and PostgreSQL runtime repository.
- Wired `signal.received` to the processor when `DATABASE_URL` is configured.
- Updated the API NATS publisher to publish existing internal events as JetStream-compatible envelopes on the event subject, so `signal.received` reaches the durable consumer path.
- Parser input uses redacted notification fields only.
- Auto-confirm remains blocked for TO_VERIFY/pending app metadata, untrusted profiles/templates, amount-only signals and negative directions.

Validation so far:
- `npm test -- --run apps/signal-worker/src/runtime.test.ts` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

Final validation rerun after API JetStream publisher alignment:
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

Result:
- Task 027 completed.
- Next task is 028_review_rejection_semantics.

## 2026-05-02 - Foundation baseline

- Repository foundation exists.
- First Codex foundation task completed.
- Next task is Order API + Payment Session.
- Previous validation commands passed:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `docker compose --env-file .env.example -f infra/docker-compose.yml config`

## 2026-05-02 - Task 003 order API

- Implemented `POST /v1/orders`.
- Implemented `GET /v1/orders/:id`.
- Added a Postgres-backed order repository with injectable test repository support.
- Added phone normalization, HMAC, and masking helpers in `@swimpay/security`.
- Created a payment session placeholder in `receiver_arming` status.
- Created a redacted `order.created` audit event for order creation.
- Did not implement payment matching, payment auto-confirmation, PSP/SBP behavior, SMS reading, bank app scraping, or official bank confirmation.

## 2026-05-02 - Task 004 payment sessions

- Implemented payment session read/checkout status endpoint at `GET /v1/payment-sessions/:id`.
- Added payment session transition guard helpers.
- Added expiry resolution for active sessions after `valid_until`.
- Added redacted audit events for session creation and receiver arming request during order creation.
- Did not implement receiver device registration, Android app behavior, matching decisions, or payment confirmation.

## 2026-05-02 - Task 005 receiver device registration

- Implemented `POST /v1/receiver-devices/register`.
- Implemented `POST /v1/receiver-devices/heartbeat`.
- Stored receiver public key, app version, Android version, notification access status, health status, and heartbeat time.
- Added redacted audit event for receiver registration.
- Did not create trusted bank package names or certificate fingerprints.
- Did not implement Android capture, signal upload, or final payment decisions.

## 2026-05-02 - Task 006 Android Receiver core

- Added `@swimpay/android-receiver` as a typed workspace package.
- Implemented local allowlist filtering for notification packages and strict certificate mismatch rejection.
- Implemented bank notification snapshot extraction for title, body, bigText, subText, textLines, metadata, and ticker text.
- Implemented privacy redaction before payload creation and encrypted outbox persistence before upload envelope construction.
- Implemented signed upload envelope construction with `event_id`, `notification_hash`, monotonic `local_counter`, and signature.
- Implemented heartbeat payload construction without payment decision data.
- Did not build a full Android/Gradle app, request Android permissions, read SMS, scrape bank apps, upload non-allowlisted notifications, or implement final payment confirmation logic.

## 2026-05-02 - Task 007 signal ingestion endpoint

- Implemented `POST /v1/receiver/signals`.
- Verified receiver device existence before accepting a signal.
- Verified deterministic foundation signatures before storage.
- Rejected duplicate `event_id` values.
- Rejected duplicate `notification_hash` values.
- Rejected local counter regressions.
- Checked bank profile existence and records first-seen package/cert pairs as `pending_verification`.
- Stored received signals without raw notification text.
- Added redacted audit storage and `signal.received` internal event publication.
- Did not implement parsing, matching, scoring, review creation, webhook delivery, or payment confirmation.

## 2026-05-02 - Task 008 bank profiles and parser

- Implemented deterministic parser helpers in `@swimpay/bank-templates`.
- Added V1 bank profiles in `learning` status with no trusted package names or certificate fingerprints.
- Added RUB amount/currency extraction for `₽`, `руб.`, and `RUB`.
- Added Russian phone normalization for `+7`, `8`, spaces, and punctuation.
- Added SwimPay reference extraction.
- Added direction classification for incoming customer transfer, outgoing payment, cashback, refund, promo, failed, and unknown.
- Added negative keyword gate and signal quality scoring.
- Added parser tests with Russian examples and negative-direction protections.
- Did not wire parser output into matching, review, webhook, or payment confirmation logic.

## 2026-05-02 - Task 009 matching core

- Implemented deterministic matching core in `@swimpay/matching-core`.
- Added candidate search by merchant, active session status, exact amount/currency, and signal observation time window.
- Added score computation for amount, currency, phone, reference, direction, trust inputs, and time window.
- Added internal decisions for `auto_confirmed`, `needs_review`, `rejected`, and `wait`.
- Enforced that amount-only signals require review and cannot auto-confirm.
- Enforced phone exact or reference exact for auto-confirm.
- Enforced collision routing to review.
- Enforced duplicate signal and already-confirmed-order rejection.
- Enforced negative/unsafe direction rejection.
- Did not wire matching core into DB writes, review queue creation, webhook delivery, or public payment confirmation.

## 2026-05-02T07:13:52.151Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T07:14:29.352Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T07:33:56.056Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T07:39:10.076Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T07:43:23.083Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T07:50:38.987Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T07:58:27.953Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T08:03:35.633Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T08:07:53.143Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T09:36:24.873Z - Agent validation fail

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- FAIL: `npm test` (Tests, exit 1)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T09:36:59.638Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02 - Task 010 review queue plan

- Scope: implement review creation helper, merchant review list endpoint, manual confirm endpoint, manual reject endpoint, review actions, review audit events, and a template feedback hook placeholder.
- Boundaries: no checkout implementation, no webhook worker implementation, no parser/matching changes beyond accepting review creation inputs, no auto-confirmation logic, no official bank wording.
- Security/privacy checks: responses must expose masked phone/reference values only; audit payloads must be redacted; raw notification text and raw phone numbers must not be introduced.
- Validation after implementation: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and Docker Compose config through the agent validator.

## 2026-05-02 - Task 010 review queue completed

- Implemented review queue API endpoints: `GET /v1/reviews`, `POST /v1/reviews/:id/confirm`, and `POST /v1/reviews/:id/reject`.
- Added review creation foundation for ambiguous `needs_review` matches, including persisted match metadata and redacted `review.created` audit payload.
- Manual confirmation now records a review action, stores a manual signal match, updates order/session state to `manual_confirmed`, writes redacted audit data, and emits `review.confirmed`.
- Manual rejection now records a review action, updates order/session state to `rejected`, writes redacted audit data, and emits `review.rejected`.
- Review list responses expose masked phone/reference fields only and do not expose raw notification text.
- Did not implement hosted checkout, webhook delivery, parser/matching worker wiring, PSP/SBP behavior, SMS reading, bank app scraping, or official bank confirmation.

## 2026-05-02 - Task 011 hosted checkout plan

- Scope: implement a minimal hosted checkout UI foundation in `apps/web`, with summary, buyer identity, payment instructions, waiting status, result text, timer, copy buttons, open-bank placeholder, paid-claim button, and polling endpoint.
- Boundaries: no payment confirmation, no API-side buyer-claimed-paid state transition, no bank integration, no PSP/SBP behavior, no raw phone storage.
- Security/product wording: the page must describe SwimPay recognition from merchant-side notification signals only and must not claim official bank confirmation or guaranteed payment.
- Validation after implementation: targeted web tests, then full agent validation.

## 2026-05-02 - Task 011 hosted checkout completed

- Refactored `apps/web` into a testable `buildWebServer()` foundation with conditional runtime startup.
- Implemented `GET /checkout/:paymentSessionId` for the hosted checkout page.
- Implemented `GET /checkout/:paymentSessionId/status` for browser polling mapped from backend session states.
- Implemented `POST /checkout/:paymentSessionId/claimed-paid` as a safe claim endpoint that explicitly does not confirm payment.
- Added checkout tests covering safe wording, buyer phone explanation, status polling, and the non-confirming paid button.
- Did not implement webhooks, admin dashboard, real bank opening integration, API-side buyer state persistence, or payment confirmation behavior.

## 2026-05-02 - Task 012 webhook worker plan

- Scope: implement a signed webhook delivery foundation in `apps/job-worker`, including public event payload creation, HMAC headers, delivery processing, retry scheduling, delivery logging contract, replay, and endpoint/event duplicate prevention.
- Boundaries: no production external calls in tests, no payment decision logic, no fake confirmation, no checkout/admin work.
- Security/product wording: every payment event must include `confirmation_type = notification_signal` and `official_bank_confirmation = false`; webhook secrets are used only for HMAC signing and are not exposed.
- Validation after implementation: targeted webhook tests, then full agent validation.

## 2026-05-02 - Task 012 webhook worker completed

- Implemented public webhook event payload creation with mandatory notification-signal disclosure.
- Implemented `SwimPay-Event-Id`, `SwimPay-Timestamp`, and `SwimPay-Signature` headers with HMAC-SHA256 signing.
- Implemented a testable `WebhookDeliveryWorker` with enqueue, delivery, retry scheduling, terminal failure, and manual replay.
- Implemented duplicate endpoint/event delivery prevention while allowing manual replay to keep the original event id and create a new delivery id.
- Added meaningful webhook tests for disclosure, signing, duplicate prevention, retry exhaustion, and replay.
- Did not implement live NATS consumption, Postgres-backed delivery polling, admin UI, PSP/SBP behavior, or payment decision logic.

## 2026-05-02 - Task 018 bank template package setup plan

- Scope: integrate the downloaded bank-template package assets into `packages/bank-templates`, keep package metadata/build compatibility, and add a setup test for TypeScript exports plus YAML/JSONL asset presence.
- Boundaries: do not rewrite the pack, do not implement parser core beyond existing foundation, do not promote templates or package/cert metadata to trusted.
- Safety checks: YAML/JSONL assets must remain trackable; no real bank package or certificate values are introduced as verified/trusted by this task.

## 2026-05-02 - Task 018 bank template package setup completed

- Imported bank-template pack directories into `packages/bank-templates`: `banks`, `fixtures`, `operations`, `policies`, `schemas`, and `shared`.
- Imported `packages/bank-templates/INDEX.md` and the pack `src/README.md`.
- Added tests proving workspace TypeScript exports are available and YAML/JSONL assets are present and not ignored by `.gitignore`.
- Did not implement final parser logic, bank profile trust promotion, real package/cert verification, or payment decision behavior.

## 2026-05-02 - Task 019 bank profile registry plan

- Scope: load V1 bank profile YAML assets, validate required fields, expose profile runtime behavior, and evaluate bank app package/cert trust gates.
- Boundaries: no template parser core, no trust promotion, no real package/cert verification, no payment auto-confirmation logic.
- Safety checks: unknown profiles must route to review-only behavior; `TO_VERIFY` package/cert entries must be untrusted and block auto-confirm candidates.

## 2026-05-02 - Task 019 bank profile registry completed

- Added `BankProfileRegistry` with default loading from `packages/bank-templates/banks/*/profile.yml`.
- Added YAML profile validation for required fields, statuses, app verification state, field priority, and supported locales.
- Added runtime behavior exposure for backend logic, including unknown-profile review-only fallback.
- Added bank app trust evaluation where `TO_VERIFY` and `pending_verification` cannot pass the trusted gate.
- Added registry tests covering all five V1 profiles, alias lookup for `sber_ru`, unknown bank fallback, `TO_VERIFY` rejection, validation failures, and explicit directory loading.
- Did not implement parser core, template promotion, real app/cert trust, or payment confirmation behavior.

## 2026-05-02 - Task 020 bank template parser core plan

- Scope: harden the deterministic parser with explicit RU text normalization, amount/currency extraction, visible phone extraction, masked-phone detection, reference extraction, direction classification, negative gates, signal quality, and reason codes.
- Boundaries: no LLMs, no payment confirmation, no trust promotion, no worker/database wiring.
- Safety checks: cashback, refund, outgoing, failed, promo, unknown, and masked-phone-only cases must not become auto-confirm candidates.

## 2026-05-02 - Task 020 bank template parser core completed

- Reworked parser core to normalize RU text deterministically before matching.
- Added actual Russian keyword support for incoming, cashback, refund, outgoing, promo, and failed classifications.
- Added masked-phone detection as a weak review hint only; it does not populate normalized sender phone and disables auto-confirm candidate output.
- Added `allowAutoConfirmCandidate` output that is true only for incoming transfer with amount, RUB currency, phone or reference, and no masked-phone-only identity.
- Added tests for cashback, refund, outgoing, failed, promo, incoming transfer, text normalization, masked-phone weak signal, and negative gates before incoming classification.
- Did not wire parser output into worker/database decisions, promote templates, or implement payment confirmation behavior.

## 2026-05-02T10:00:33.072Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:05:50.128Z - Agent validation fail

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- FAIL: `npm test` (Tests, exit 1)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:06:32.297Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:10:54.665Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:14:08.775Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:18:17.859Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:25:04.710Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02 - Task 021 bank template fixtures tests plan

- Scope: load JSONL fixtures from global, adversarial, and bank-specific bank-template assets and compare parser output to expected labels.
- Boundaries: no parser trust promotion, no payment confirmation, no worker/database wiring, no real bank package or cert values.
- Safety checks: amount-only, cashback, refund, outgoing, failed, promo, and adversarial fixtures must never become auto-confirm candidates.

## 2026-05-02 - Task 021 bank template fixtures tests completed

- Added a JSONL fixture loader for global, adversarial, and bank-specific redacted fixture files.
- Added deterministic placeholder materialization for safe parser inputs without storing raw notification text.
- Added fixture corpus tests for expected direction labels, amount/phone/reference extraction flags, reason codes, and auto-confirm candidate flags.
- Added explicit negative checks proving amount-only and non-customer-transfer fixtures cannot become auto-confirm candidates.
- Hardened parser direction support for outgoing transfer fixtures and added reason codes for amount-only, balance disambiguation, and non-customer-transfer cases.
- Did not implement drift radar, template learning, trust promotion, or payment confirmation behavior.

## 2026-05-02 - Task 022 bank template drift radar plan

- Scope: implement a pure bank-template drift radar based on YAML templates, canonicalized notification shapes, similarity, unknown rate, extraction success, phone/reference visibility, and parser confidence metrics.
- Boundaries: no automatic trust promotion, no parser learning lifecycle, no database/worker wiring, no payment confirmation, no real bank package/cert values.
- Safety checks: new template candidates must stay untrusted, and critical drift must disable auto-confirm eligibility for the affected bank.

## 2026-05-02 - Task 022 bank template drift radar completed

- Added `packages/bank-templates/src/drift.ts` with known-template loading, canonicalization, similarity scoring, drift metrics, candidate detection, status classification, and `template.drift_detected` event creation.
- Added tests for similarity, new candidate safety, critical drift bank auto-confirm disabling, drift event reason codes, and default YAML template loading against fixture materialized samples.
- New template candidates are emitted with `status: new`, `recommendedStatus: learning`, and `allowAutoConfirmCandidate: false`.
- Critical drift returns `recommendedBankAutoConfirmStatus: review_only` and `autoConfirmAllowedForBank: false`.
- Did not implement template learning, trust promotion, admin controls, or payment confirmation behavior.

## 2026-05-02 - Task 013 bank template learning plan

- Scope: implement deterministic template learning primitives for canonicalization, hashing, stats updates, lifecycle recommendation, reliability scoring, shadow evidence, and basic mutation prediction.
- Boundaries: no database/worker wiring, no automatic trust without evidence, no payment confirmation, no LLMs, and no real bank package/cert values.
- Safety checks: raw inputs must become redacted templates, false positives must degrade the template, new templates must start in learning, and mutation candidates must remain untrusted.

## 2026-05-02 - Task 013 bank template learning completed

- Added `packages/bank-templates/src/learning.ts` with redacted canonical template generation, SHA-256 template hashes, learning stats updates, reliability scoring, lifecycle recommendations, and safe mutation candidates.
- Added tests for raw notification redaction, stable hashing, seen count increments, false-positive review-only degradation, no promotion without human evidence, trusted-low-amount requirements, and mutation candidate safety.
- Lifecycle recommendations support `new`, `learning`, `shadow_testing`, `trusted_low_amount`, `trusted`, `degraded`, `review_only`, and `disabled`.
- Trusted lifecycle statuses require evidence thresholds and shadow/reviewer agreement; new mutations remain `status: new` and `allowAutoConfirmCandidate: false`.
- Did not wire learning into workers, databases, admin controls, or payment confirmation behavior.

## 2026-05-02 - Task 014 deployment docker compose plan

- Scope: harden the single-server Docker Compose deployment with a proxy, private data/service networks, health checks, log rotation, and 2 GB RAM-conscious memory limits.
- Boundaries: no production deployment, no production secrets, no Kubernetes, no Kafka, and no unrelated application behavior.
- Safety checks: PostgreSQL, Valkey, NATS, API, web, and workers must not publish host ports; only the proxy may publish a local public port.

## 2026-05-02 - Task 014 deployment docker compose completed

- Added Caddy proxy service as the only host-port-publishing service, defaulting to `HTTP_PORT=8080` for local development.
- Moved API and web from published ports to private `expose` entries and routed `/v1/*`, `/api/*`, and web traffic through Caddy.
- Kept PostgreSQL, Valkey, and NATS on the private Compose network without public host ports.
- Added service health checks, configurable Docker log rotation, and memory limits appropriate for the compact V1 single-server target.
- Added deployment tests asserting required services, proxy-only public ports, private data services, health checks, and log rotation.
- Did not deploy, add production secrets, Kubernetes, Kafka, or any product feature behavior.

## 2026-05-02 - Task 015 security hardening plan

- Scope: strengthen shared security helpers, API logger redaction, API key/webhook secret hashing, phone HMAC/masking tests, webhook signature tests, and receiver anti-replay/signature tests.
- Boundaries: no production secrets, no deployment, no PSP/SBP behavior, no raw phone storage, no raw notification storage, and no unrelated product features.
- Safety checks: sensitive values must be redacted from logs, API keys/webhook secrets must hash without raw storage, and signature verification must fail on tampering.

## 2026-05-02 - Task 015 security hardening completed

- Added API key hash/verify helpers and webhook secret hash/verify helpers in `@swimpay/security`.
- Added recursive log redaction and shared Fastify logger redaction paths for authorization, signatures, secrets, raw notification text, and raw payload fields.
- Updated the API service to use redacted Fastify logging options.
- Extended tests for API key hashing, webhook secret hashing, phone HMAC/masking, sensitive log redaction, webhook signature verification/tamper rejection, and existing receiver signature rejection.
- Did not introduce production secrets, raw phone storage, raw notification storage, or payment confirmation behavior.

## 2026-05-02T10:36:28.979Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:44:03.737Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:48:38.989Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:53:38.485Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:59:41.205Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02 - Task 016 end-to-end tests plan

- Scope: add meaningful in-process E2E coverage for order/session matching inputs, safe incoming signal decision, signed webhook delivery, review routing, unsafe direction rejection, duplicate signal rejection, and collision handling.
- Boundaries: no production external calls, no new product feature implementation, no raw phone or raw notification fixtures, no official bank confirmation wording.
- Safety checks: tests must use fake redacted data, verify unsafe paths do not auto-confirm, and verify public webhook disclosure fields remain `confirmation_type: notification_signal` and `official_bank_confirmation: false`.

## 2026-05-02 - Task 016 end-to-end tests completed

- Added `tests/e2e-payment-signal-flow.test.ts` covering a foundation payment signal flow across matching-core and webhook worker primitives.
- Verified safe incoming signal matching can produce `auto_confirmed` only with exact identity and trust gates, then enqueues and delivers a signed webhook with notification-signal disclosure fields.
- Verified missing phone/reference routes to review, cashback and outgoing signals reject, duplicate signals reject, and amount collisions route to review.
- Used HMAC values derived from redacted placeholders only; no raw notification text, raw phone fixtures, production calls, PSP/SBP behavior, or official bank confirmation wording were introduced.

## 2026-05-02T11:05:00.000Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02 - Task 017 admin console minimal plan

- Scope: add minimal operator admin API endpoints for bank profiles, template registry, drift events, webhook failures, receiver health, and audit event search.
- Scope: allow an operator to mark a template `degraded` or `review_only` with a redacted audit event.
- Boundaries: no browser UI, no template promotion, no package/cert trust verification, no raw PII exposure, no unsafe bulk admin actions, no payment decision changes.
- Safety checks: operator-only placeholder auth, redacted action reasons, canonical/redacted template fields only, and audit events for every mutation.

## 2026-05-02 - Task 017 admin console minimal completed

- Added `apps/api/src/admin.ts` with a Postgres admin repository and in-memory test repository.
- Added `/v1/admin/bank-profiles`, `/v1/admin/templates`, `/v1/admin/drift-events`, `/v1/admin/webhook-failures`, `/v1/admin/receiver-health`, and `/v1/admin/audit-events`.
- Added `/v1/admin/templates/:id/degrade` and `/v1/admin/templates/:id/review-only` actions that update template status and write redacted operator audit events.
- Added admin API tests covering read views, operator authorization, template degradation, review-only marking, redacted reasons, and audit event creation.
- Did not implement template promotion, bank app/cert trust verification, dangerous admin actions, raw PII access, PSP/SBP behavior, or official bank confirmation wording.

## 2026-05-02T11:18:00.000Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T11:19:10.000Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02 - Task 023 bank template admin console plan

- Scope: extend the admin template foundation with safe bank-template actions: promote, degrade, review-only, disable, and mark false positive.
- Boundaries: no browser UI, no real package/cert verification workflow, no invented bank package/cert values, no raw PII access, no payment confirmation behavior.
- Safety checks: trusted promotions must fail if false positives exist, if evidence thresholds are missing, or if bank app metadata is still `TO_VERIFY`; disable and false-positive actions must block template auto-confirm eligibility.

## 2026-05-02 - Task 023 bank template admin console completed

- Added template promotion endpoint with explicit `target_status` for `shadow_testing`, `trusted_low_amount`, and `trusted`.
- Added disable and false-positive endpoints for bank templates.
- Added promotion guards for false positives, evidence thresholds, and verified non-`TO_VERIFY` bank app metadata.
- False-positive marking increments `false_positive_count`, moves the template to `review_only`, lowers reliability, and disables auto-confirm eligibility.
- Disable immediately returns `auto_confirm_allowed_by_template: false` and writes a redacted operator audit event.
- Added tests for promotion success, false-positive promotion blocking, `TO_VERIFY` trust blocking, false-positive marking, disable behavior, operator auth, and redacted audit events.
- Did not implement real package/cert verification, template merging, browser UI, PSP/SBP behavior, raw PII access, or official bank confirmation wording.

## 2026-05-02T11:28:00.000Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02 - Autonomous run complete

- Completed all pending root tasks in the configured queue from 010 through 023.
- No tasks were skipped or blocked.
- Wrote `.swimpay-agent/AUTONOMOUS_RUN_REPORT.md`.
- Next recommended root task: none currently queued.

## 2026-05-02T11:12:08.578Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T11:18:17.068Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)
## 2026-05-02T14:35:00+03:00 - Task 024 plan

Task: `024_operator_auth_and_admin_rbac`

Plan:

- Create Phase 2 task files 024-031 and replace the completed foundation queue with the durable runtime queue.
- Add failing tests for centralized operator roles/permissions and admin endpoint auth/RBAC behavior.
- Implement RBAC constants and auth helpers in `@swimpay/security`.
- Replace API admin placeholder auth with configured dev-token auth and signed-token production foundation.
- Require explicit permissions for admin reads and dangerous bank-template actions.
- Update local docs and agent reports.

Guardrails:

- No production deployment.
- No production secrets.
- No PSP/SBP/SMS/scraping behavior.
- No official bank confirmation wording.
- No raw phone or raw notification storage.
- No implementation of tasks 025-031.

## 2026-05-02T14:47:23+03:00 - Task 024 implementation

Result: implemented.

Changes:

- Added Phase 2 task files `024` through `031`.
- Replaced the active queue with Phase 2 durable runtime tasks and marked `024` complete.
- Added centralized operator roles, permissions, role-permission mappings, dev-token auth and signed-token verification in `@swimpay/security`.
- Admin endpoints now reject missing auth and placeholder `Bearer admin_<operator_id>` tokens.
- Admin endpoints now enforce explicit permissions for reads, template promotion, degradation/review-only, disable and false-positive actions.
- Template audit events now use the authenticated operator id instead of accepting an actor override from request body.
- Added `docs/ADMIN_AUTH_AND_RBAC.md` and updated local development/implementation notes.

Targeted TDD evidence:

- `npm test -- packages/security/src/index.test.ts`: RED, then PASS after implementation.
- `npm test -- apps/api/src/admin.test.ts`: RED, then PASS after implementation.
- `npm run typecheck`: PASS after implementation.

## 2026-05-02T14:50:30+03:00 - Task 024 validation pass

Final validation:

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 22 test files and 123 tests passed
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS

Notes:

- Initial full `npm test` failed because `tests/agent-framework.test.ts` still asserted the old task queue. The test was updated to verify the Phase 2 queue order and the full test suite then passed.
- No blockers were added.

## 2026-05-02T15:10:00+03:00 - Task 025 plan

Task: `025_nats_jetstream_consumers`

Plan:

- Add typed NATS/JetStream runtime helpers in `@swimpay/events` instead of scattering NATS code across services.
- Define the `SWIMPAY_EVENTS` stream subjects from the internal event catalog.
- Add a runtime internal event envelope with validation and raw-PII field rejection.
- Add durable consumer definitions and an explicit ack/nack/term handler wrapper.
- Register safe stub consumers in signal worker and job worker.
- Update docs and local agent reports.

Guardrails:

- No webhook delivery loop.
- No parser, matching, review or payment decision runtime wiring.
- No Android receiver implementation.
- No raw phone or raw notification storage.
- No official bank confirmation wording.

## 2026-05-02T15:16:00+03:00 - Task 025 implementation

Result: implemented.

Changes:

- Added `nats` as the NATS client dependency for `@swimpay/events`.
- Added `InternalEventEnvelope`, NATS config parsing, stream configuration, publish/connect/close helpers, durable consumer definitions, consumer option summaries, and message processing with explicit ack/nack/term behavior.
- Added `payment_session.expired` to the internal event catalog for the job worker expiry consumer.
- Signal worker now registers durable consumer skeletons for `signal.received`, `signal.verified`, `signal.parsed`, and `match.scored`.
- Job worker now registers durable consumer skeletons for `webhook.delivery_requested`, `order.expired`, and `payment_session.expired`.
- Worker health responses now include NATS connection state and registered consumer metadata.
- Added documentation in `docs/NATS_JETSTREAM_CONSUMERS.md`, `docs/07_EVENT_CATALOG.md`, `docs/IMPLEMENTATION_NOTES.md`, and `docs/LOCAL_DEVELOPMENT.md`.

Targeted TDD evidence:

- `npm test -- packages/events/src/jetstream.test.ts`: RED, then PASS after implementation.
- `npm test -- apps/signal-worker/src/consumers.test.ts apps/job-worker/src/consumers.test.ts`: RED, then PASS after implementation.
- `npm run typecheck`: PASS after fixing NATS enum typing and event envelope narrowing.

## 2026-05-02T15:19:08+03:00 - Task 025 validation pass

Final validation:

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 25 test files and 136 tests passed
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS

Notes:

- NATS consumers intentionally acknowledge only validated known events for now.
- Durable webhook delivery remains task 026.
- Live signal parser/matching/review runtime integration remains task 027.
- No blockers were added.

## 2026-05-02T15:22:00+03:00 - Task 026 plan

Task: `026_postgres_webhook_delivery_loop`

Plan:

- Add failing tests for durable webhook statuses, claim behavior, retry/dead transitions, signed headers with delivery id, PII rejection, NATS event handling and fallback polling.
- Extend the existing webhook worker foundation instead of creating a second webhook system.
- Add a minimal database migration for payload JSON, max attempts, HTTP status, updated timestamps, replay linkage and replay-safe endpoint/event uniqueness.
- Connect the job worker `webhook.delivery_requested` consumer to the delivery processor.
- Keep PostgreSQL as the source of truth and avoid Valkey locks for delivery state.
- Update docs and local agent reports.

Guardrails:

- No signal runtime pipeline.
- No parser/matching/review runtime integration.
- No Android Receiver logic.
- No payment auto-confirmation.
- No production deployment.
- No raw phone or raw notification payload exposure.

## 2026-05-02T15:34:00+03:00 - Task 026 implementation

Result: implemented.

Changes:

- Reworked `apps/job-worker/src/webhooks.ts` around explicit durable statuses: `pending`, `delivering`, `delivered`, `failed`, `dead`, and `cancelled`.
- Added in-memory and PostgreSQL repository support for claiming due deliveries, claiming by delivery id, and claiming by event id.
- Added `FOR UPDATE SKIP LOCKED`-based Postgres claim SQL.
- Added signed delivery headers with `SwimPay-Delivery-Id`.
- Added deterministic retry scheduling for attempts 1 through 7.
- Added sanitized network/HTTP error recording and terminal `dead` state.
- Added raw PII field-marker rejection for webhook payload data.
- Added internal replay helper behavior that keeps the original public event id and creates a new delivery id.
- Added `apps/job-worker/src/webhook-runtime.ts` for worker config, NATS handler and fallback polling loop.
- Connected job worker `webhook.delivery_requested` to the delivery processor while leaving order/session expiry consumers as safe stubs.
- Added migration `002_webhook_delivery_loop.sql`.
- Updated webhook docs, schema docs, event catalog, local development notes and implementation notes.

Targeted TDD evidence:

- `npm test -- apps/job-worker/src/webhooks.test.ts apps/job-worker/src/webhook-runtime.test.ts`: RED, then PASS after implementation.
- `npm run typecheck`: PASS after implementation.
- `npm test -- apps/job-worker/src/webhooks.test.ts apps/job-worker/src/webhook-runtime.test.ts apps/api/src/admin.test.ts tests/foundation.test.ts`: PASS.

## 2026-05-02T15:37:20+03:00 - Task 026 validation pass

Final validation:

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 26 test files and 144 tests passed
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS

Notes:

- Webhook delivery is now durable and Postgres-backed.
- The fallback polling loop is disabled by default and enabled with `WEBHOOK_WORKER_ENABLED=true`.
- The signal parser/matching/review runtime pipeline remains task 027.
- No blockers were added.
# 2026-05-02 - Task 030 Runtime Observability

Plan:
- Add a small shared observability package for redaction, structured logs, in-process metrics, safe health snapshots and lightweight worker status helpers.
- Protect API observability through existing admin RBAC and avoid introducing a new product surface.
- Instrument safe paths only: API order/session creation, signal decisions, webhook delivery outcomes and JetStream ack/nack bookkeeping.
- Add focused tests first, then implement only the observability plumbing.

Result:
- Added `@swimpay/observability` with deep sensitive-field redaction, structured logger, metrics registry, health snapshot builder, worker status tracker and webhook queue summary helper.
- API health now includes uptime and timestamp; API requests return `X-Correlation-Id`.
- Added RBAC-protected `GET /v1/admin/metrics` and `GET /v1/admin/runtime-status`.
- Instrumented order/session creation, receiver signal ingestion duplicates, review confirm/reject, signal runtime parse/review/reject/auto-confirm decisions, webhook delivery outcomes and JetStream ack/nack/error counters.
- Expanded existing security log redaction for phones, notification text, raw bodies/titles, tokens and passwords.
- Added `docs/RUNTIME_OBSERVABILITY.md` and updated local development and implementation notes.

Validation:
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

# 2026-05-02 - Sprint 3B Android Receiver MVP Foundation

Plan:
- Create tasks 037 through 041 and move the task queue to Sprint 3B.
- Prepare `apps/android-receiver` for Android MVP work with Kotlin-source-ready structure and local TypeScript tests.
- Add listener boundary, allowlist/package verification, snapshot extraction/coalescing, privacy firewall and local parser hints.
- Preserve all Android guardrails: no SMS, no scraping, no raw PII upload, no payment confirmation, backend decides.

Result:
- Added task files `037_android_project_setup` through `041_privacy_firewall_and_local_parser`.
- Added `apps/android-receiver/README.md`, config placeholder and Android source skeleton.
- Added `AndroidReceiverNotificationListener`, `BankPackageVerificationStatuses`, `evaluateAllowedBankPackage`, `buildNotificationSnapshot`, `NotificationCoalescer` and `runPrivacyFirewall`.
- Added tests for listener ignore behavior, `TO_VERIFY` untrusted behavior, snapshot coalescing, privacy redaction and local parser hints.
- Replaced Android Receiver examples that used real-looking package names with synthetic package/cert values.
- Added `docs/ANDROID_RECEIVER_MVP_FOUNDATION.md`.

Validation:
- `npm test -- --run apps/android-receiver/src` PASS
- `npm run typecheck --workspace @swimpay/android-receiver` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS (`32` test files, `214` tests)
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS
- Android/Gradle tests not run because the repo does not yet include a Gradle wrapper or Android SDK build configuration.

# 2026-05-02 - Sprint 3C Receiver Lifecycle, Signed Upload, Outbox and Health

Plan:
- Create tasks 042 through 048 and move the task queue to Sprint 3C.
- Add testable receiver clients for registration, signed heartbeat and signed signal upload.
- Add encrypted outbox retry modeling, safe receiver health warnings and a local backend smoke plan.
- Document Android Gradle readiness without adding unstable Gradle tooling.

Result:
- Added task files `042_receiver_device_registration_client` through `048_android_gradle_readiness_plan`.
- Added lifecycle helpers in `apps/android-receiver/src/index.ts`.
- Added `apps/android-receiver/src/android-receiver-lifecycle.test.ts`.
- Added `scripts/receiver-local-smoke.mjs` and `npm run smoke:receiver`.
- Added `docs/ANDROID_RECEIVER_LIFECYCLE.md` and `docs/ANDROID_GRADLE_READINESS_PLAN.md`.
- Updated Android Receiver docs, local development notes, implementation notes and agent queue state.

Validation:
- `npm test -- --run apps/android-receiver/src/android-receiver-lifecycle.test.ts` RED first, then PASS after implementation.
- `npm run typecheck --workspace @swimpay/android-receiver` PASS
- `npm test -- --run apps/android-receiver/src` PASS
- `npm test -- --run apps/android-receiver/src tests/agent-framework.test.ts` PASS
- `npm run smoke:receiver` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS (`33` test files, `223` tests)
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS
- Android/Gradle tests not run because no Gradle wrapper or Android SDK build configuration exists yet.

# 2026-05-02 - Sprint 3D Android Runnable App Setup

Plan:
- Create tasks 049 through 056 and move the task queue to Sprint 3D.
- Add Android Gradle project files without inventing a wrapper JAR.
- Add manifest, status screen/model, Android Keystore signer skeleton, encrypted outbox platform boundary and WorkManager retry skeleton.
- Add emulator smoke documentation and closeout review.
- Keep Android capture/filter/redact/sign/upload only.

Result:
- Added Gradle project files under `apps/android-receiver/android`.
- Added `MainActivity`, `ReceiverStatusViewModel`, Android Keystore signer, fake signer, encrypted outbox interfaces/adapters and `SignalUploadWorker`.
- Added `docs/ANDROID_EMULATOR_SMOKE_TEST.md`.
- Added `.swimpay-agent/ANDROID_MVP_CLOSEOUT_REVIEW.md`.
- Added static tests in `apps/android-receiver/src/android-runnable-app.test.ts`.
- Added `npm run android:doctor`.

Validation:
- `npm test -- --run apps/android-receiver/src/android-runnable-app.test.ts` RED first, then PASS after implementation.
- `npm test -- --run apps/android-receiver/src tests/agent-framework.test.ts` PASS
- `npm run android:doctor` PASS as diagnostic; Java and Android SDK present, Gradle unavailable.
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS (`34` test files, `227` tests)
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS
- Android Gradle assemble not run because no `gradle` command is available and no wrapper JAR is checked in.
# 2026-05-02 - Task 031 Android Receiver Contract Validation

Plan:
- Add shared Android Receiver contract DTOs and validators in `@swimpay/contracts`.
- Strengthen existing receiver registration, heartbeat and signal upload endpoints around those contracts.
- Keep Android as capture/filter/redact/sign/upload only; backend remains the only decision maker.
- Reject raw phone/raw notification fields by default and document restricted debug behavior as not implemented.
- Add tests first for contract validation, API behavior, anti-replay/privacy and observability counters.

Result:
- Added shared Android Receiver DTOs, validation helpers, error codes, snapshot/coalescing contracts and canonical signed payload generation in `@swimpay/contracts`.
- Strengthened receiver registration, heartbeat and signal upload API validation.
- Rejected raw phone fields, raw notification text, missing signatures, invalid timestamps, invalid currency and non-integer minor-unit amounts before persistence.
- Preserved `TO_VERIFY` package/cert metadata as untrusted and non-confirming.
- Added receiver observability counters for registration, heartbeat, accepted signals, rejected signals and invalid signatures.
- Updated Android Receiver contract/spec documentation and local development notes.

Validation:
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

Completed at: 2026-05-02T17:48:21+03:00.

# 2026-05-02 - Sprint 3A / Task 032 Device Signature Verification Hardening

Plan:
- Add tests first for explicit receiver signature algorithm, unknown device rejection, suspended/revoked device rejection, invalid signature rejection and local counter replay protection.
- Keep the verifier deterministic and testable without introducing a production bypass.
- Preserve Android as capture/redact/sign/upload only; backend remains the decision point.

Result:
- Added explicit `hmac_sha256_canonical_v1` receiver signature algorithm constant.
- Changed signature verification to return a typed result with algorithm and failure reason.
- Blocked suspended, revoked and disabled receiver devices from signal upload before signature persistence.
- Added rejected-signal metrics for unknown and disabled devices.
- Documented the current deterministic verifier and future asymmetric verification requirement.

Validation:
- `npm test -- --run packages/contracts/src/android-receiver.test.ts apps/api/src/signals.test.ts` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

# 2026-05-02 - Sprint 3A / Task 033 Live Docker Runtime Smoke Tests

Plan:
- Add a local smoke checker for Docker Compose runtime readiness.
- Verify service presence, private infrastructure exposure, healthchecks and log rotation.
- Document exact local commands without deploying to production or changing product behavior.

Result:
- Added `npm run smoke:runtime`.
- Added a Compose config inspector for expected services, internal private network, healthchecks, log rotation and host port exposure.
- Added unit tests for safe Compose shape, forbidden infrastructure ports and missing runtime healthchecks.
- Added `docs/LIVE_DOCKER_RUNTIME_SMOKE.md` and local development notes.

Validation:
- `npm test -- --run tests/live-runtime-smoke.test.ts` PASS
- `npm run smoke:runtime` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

# 2026-05-02 - Sprint 3A / Task 034 Backend Receiver Signal Live Flow

Plan:
- Strengthen the in-process durable E2E receiver upload flow around response semantics.
- Verify accepted receiver uploads remain backend-decision-pending and cannot imply payment confirmation.
- Document the synthetic backend flow and privacy constraints.

Result:
- Added assertions that API receiver signal upload returns `status: received`, `accepted: true` and `next_action: backend_decision_pending`.
- Verified the response does not include `official_bank_confirmation`.
- Preserved the existing runtime check that `TO_VERIFY` bank metadata routes to review and never auto-confirms.
- Added `docs/BACKEND_RECEIVER_SIGNAL_LIVE_FLOW.md`.

Validation:
- `npm test -- --run tests/durable-worker-e2e.test.ts` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

# 2026-05-02 - Sprint 3A / Task 035 Bank App Verification Workflow

Plan:
- Add a guarded operator/admin workflow for observed bank app package/certificate metadata.
- Keep `TO_VERIFY` metadata untrusted and impossible to verify automatically.
- Audit verification actions and avoid exposing full certificate fingerprints.

Result:
- Added `GET /v1/admin/bank-app-signatures`.
- Added `POST /v1/admin/bank-app-signatures/:id/verify`.
- Verification requires `promote_bank_templates`, writes `admin.bank_app_signature.verified`, and updates admin repository state.
- Added tests for listing metadata, blocking `TO_VERIFY`, verifying synthetic observed metadata, and permission denial.
- Added `docs/BANK_APP_VERIFICATION_WORKFLOW.md`.

Validation:
- `npm test -- --run apps/api/src/admin.test.ts` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

# 2026-05-02 - Sprint 3A / Task 036 Phase 2 Closeout Review

Plan:
- Create Phase 2 closeout review.
- Create Sprint 3A report.
- Update blockers, next action and queue state.

Result:
- Added `.swimpay-agent/PHASE_2_CLOSEOUT_REVIEW.md`.
- Added `.swimpay-agent/SPRINT_3A_REPORT.md`.
- Updated `.swimpay-agent/BLOCKERS.md`, `.swimpay-agent/NEXT_ACTION.md`, `.swimpay-agent/CURRENT_TASK.md` and `.swimpay-agent/TASK_QUEUE.md`.

Validation:
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS
## 2026-05-02 - Sprint 4A / Android Toolchain Activation and Build Validation

Plan:
- Improve Android toolchain diagnostics without faking Gradle success.
- Document safe Gradle wrapper generation policy.
- Record `assembleDebug` and Android JVM test status honestly.
- Keep Node/Compose validation passing.

Result:
- Added Sprint 4A task files `057` through `061`.
- Updated `.swimpay-agent/TASK_QUEUE.md` to Sprint 4A.
- Improved `npm run android:doctor` to report Java, Android SDK, Gradle, Gradle wrapper, Android module path and `assembleDebug` readiness.
- Added `docs/GRADLE_WRAPPER_POLICY.md`.
- Added `docs/ANDROID_JVM_UNIT_TEST_PLAN.md`.
- Added `.swimpay-agent/ANDROID_BUILD_TOOLCHAIN_REPORT.md` and `.swimpay-agent/SPRINT_4A_REPORT.md`.
- Java and Android SDK are available.
- Gradle and the Gradle wrapper are unavailable, so `assembleDebug` and Android JVM tests remain blocked and are not claimed as passed.

Validation:
- `npm run android:doctor` PASS as diagnostic
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS
