# Progress Log

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
