# Implementation Notes

## Foundation Layer

This foundation sets SwimPay up as a TypeScript npm-workspace monorepo with deployable skeletons for:

- `swimpay-api`
- `swimpay-signal-worker`
- `swimpay-job-worker`
- `swimpay-web`

Shared packages now define the first typed surfaces for events, contracts, database migrations, security constants, matching-core placeholders, risk-core placeholders, shared utilities, and bank-template stubs.

## Bank Templates

The active `packages/bank-templates` package was integrated from `swimpay_bank_templates_pack`. Only the TypeScript type/status/reason-code stubs and documentation were brought into the build flow.

No parser, final payment decision, trust promotion, or auto-confirmation logic was implemented.

Task 018 imported the downloaded bank-template pack assets into `packages/bank-templates`, including bank directories, fixtures, operations runbooks, policies, schemas, shared extractor/redaction definitions, and the package index document. YAML and JSONL assets are intentionally trackable by git.

These assets are data and review material only at this stage. They do not make templates trusted and do not create verified bank app package/certificate metadata.

Task 019 added a bank profile registry loader for the package YAML assets. It validates required profile fields, exposes runtime behavior for backend logic, returns review-only behavior for unknown profiles, and prevents `TO_VERIFY` or `pending_verification` bank app metadata from passing the trusted app gate.

Task 020 hardened the deterministic parser core. It now normalizes RU text before matching, supports actual Russian keyword gates, detects masked phone values as weak review hints only, emits reason codes, and exposes `allowAutoConfirmCandidate` only for safe incoming transfer candidates with amount, RUB currency, and visible phone or reference.

Task 021 added automated JSONL fixture coverage for the bank-template corpus. The tests load global, adversarial, and bank-specific redacted samples, materialize safe placeholder values for parser input, compare expected direction labels and auto-confirm candidate flags, and assert that amount-only or negative fixtures never become auto-confirm candidates.

Task 022 added a bank-template drift radar foundation. It loads template YAML assets, canonicalizes redacted notification shapes, calculates similarity to known templates, tracks unknown rate, amount extraction success, phone/reference visibility, and parser confidence, and outputs `stable`, `minor_drift`, `major_drift`, or `critical_drift` with reason codes. New template candidates remain `new`/`learning` recommendations only and are never trusted automatically; critical drift recommends review-only bank behavior and disables auto-confirm eligibility for the affected bank.

Task 013 added the bank-template learning lifecycle foundation. It canonicalizes notification text into redacted templates, hashes canonical templates, updates observation/review/shadow stats, calculates reliability, recommends lifecycle status across `new`, `learning`, `shadow_testing`, `trusted_low_amount`, `trusted`, `degraded`, `review_only`, and `disabled`, and predicts mutation candidates for shadow testing. False positives force review-only behavior, and trusted statuses require human verification plus shadow evidence.

Task 014 hardened Docker Compose for the single-server deployment model. A Caddy proxy is now the only service publishing a host port by default, while PostgreSQL, Valkey, NATS, API, web, and workers stay on the private Compose network. Compose now includes service health checks, configurable Docker log rotation, and memory limits sized for the 2 GB RAM V1 target.

Task 015 added security hardening primitives. `@swimpay/security` now includes API key hashing/verification, webhook secret hashing/verification, HMAC helpers, phone masking, recursive log redaction, and Fastify logger redaction paths. The API server now uses redacted logger options, and tests cover API key storage safety, webhook secret storage safety, phone HMAC/masking, sensitive log redaction, webhook signature verification, and receiver signal signature rejection.

Task 016 added an end-to-end payment signal foundation test. It exercises order/session-like matching inputs, a safe incoming signal auto-confirm decision through matching-core trust gates, signed webhook delivery after confirmation, review routing for missing identity, rejection for cashback/outgoing/duplicate signals, and collision routing to review. The test uses redacted placeholder-derived HMAC values and does not use production external calls.

## Database

`packages/database/migrations/001_initial_schema.sql` creates the initial core tables and indexes from `docs/05_DATABASE_SCHEMA.md`, including:

- unique `notification_signals.event_id`
- unique `notification_signals.notification_hash`
- unique confirmed order protection
- unique confirmed signal protection
- hashed API key storage via `api_keys.key_hash`
- HMAC/masked phone fields without raw phone columns
- no raw notification text column by default

V1 bank profiles are seeded in `learning` status only. No trusted package names or certificate fingerprints are seeded.

## Current Limitations

- API exposes `/health`, `POST /v1/orders`, `GET /v1/orders/:id`, `GET /v1/payment-sessions/:id`, receiver device endpoints, signal ingestion, and review queue endpoints.
- Order API authentication is a local foundation placeholder: `Authorization: Bearer test_<merchant_id>`. Real hashed API key validation is still intentionally not implemented.
- Order creation creates an order, a receiver-arming payment session placeholder, and a redacted audit event.
- Payment session creation now records redacted audit events for `payment_session.created` and `payment_session.receiver_arming_requested`.
- `GET /v1/payment-sessions/:id` returns checkout session status and reports expired sessions after `valid_until`.
- Receiver device registration now supports `POST /v1/receiver-devices/register` and stores public key, app version, Android version, initial trust score, and a redacted registration audit event.
- Receiver heartbeat now supports `POST /v1/receiver-devices/heartbeat` and updates notification access state, health status, app version, and last heartbeat time.
- Workers only expose health endpoints and do not process jobs.
- Web now serves a hosted checkout foundation at `GET /checkout/:paymentSessionId`, with summary, buyer identity, payment instructions, waiting status, result text, timer, copy buttons, open-bank placeholder, and a safe `J'ai paye` button.
- Web exposes `GET /checkout/:paymentSessionId/status` for checkout polling and `POST /checkout/:paymentSessionId/claimed-paid` as a non-confirming buyer claim endpoint.
- `J'ai paye` does not confirm payment and only moves the local checkout UI toward waiting for the merchant-side signal.
- Web is not yet a merchant dashboard or admin console.
- Android Receiver now has a TypeScript foundation core under `apps/android-receiver` for allowlist filtering, notification snapshot extraction, redaction, encrypted outbox persistence, signed upload envelope creation, and heartbeat payload construction.
- Android Receiver is not yet a full Android/Gradle app and does not request Android permissions or run a platform notification listener in this foundation step.
- Signal ingestion now supports `POST /v1/receiver/signals` with device existence checks, deterministic foundation signature verification, duplicate `event_id` rejection, duplicate `notification_hash` rejection, local counter regression rejection, bank profile checks, pending bank app signature observation, redacted audit storage, and `signal.received` publication through the internal event publisher.
- The current signal signature verifier uses the registered receiver `public_key` field as a local deterministic verification key for this foundation. Real Android keypair verification is intentionally left for security hardening.
- Bank templates now include a deterministic V1 parser foundation for Russian notification text: amount/currency extraction, Russian phone normalization, SwimPay reference extraction, direction classification, negative keyword gates, signal quality scoring, and V1 bank profiles in `learning` status.
- Parser directions separate customer transfers from cashback, refunds, outgoing payments, promos, failed transfers, balance updates, and unknown signals.
- Matching core now includes a deterministic pure function for candidate search, exact amount/currency matching, phone/reference matching, time-window checks, collision detection, score computation, and internal decision output.
- Matching core blocks amount-only auto-confirmation, duplicate signal reuse, double-confirming an order, unsafe directions, and unresolved collisions.
- Review queue foundation now supports `GET /v1/reviews`, `POST /v1/reviews/:id/confirm`, and `POST /v1/reviews/:id/reject`.
- Review creation is available as a backend foundation helper/repository method for ambiguous `needs_review` matches.
- Manual review confirmation updates order and payment session state to `manual_confirmed`, records a review action, writes redacted audit data, persists a manual match, and emits an internal `review.confirmed` event with notification-signal disclosure fields.
- Manual review rejection updates order and payment session state to `rejected`, records a review action, writes redacted audit data, and emits an internal `review.rejected` event.
- Matching core is not yet wired into the signal worker pipeline. The review creation foundation exists, but automatic creation from live matching decisions is still a later integration step.
- Webhook delivery is not implemented yet; review events are only published internally for the future worker.
- Webhook worker foundation now includes public payment event creation, required notification-signal disclosure fields, HMAC signing, SwimPay webhook headers, retry scheduling, duplicate endpoint/event prevention, delivery status updates, and replay with the original event id.
- Webhook worker tests use an injectable HTTP client and in-memory repository; no production external calls are made during tests.
- The webhook worker is not yet connected to NATS JetStream event consumption or a Postgres-backed delivery loop.
- End-to-end tests now cover the foundation signal flow across matching-core and webhook worker primitives, including unsafe-path protections. They are still in-process tests and do not replace future Postgres/NATS integration tests.
- No official bank confirmation wording or status was introduced.
- Receiver registration does not mark any bank package name or certificate fingerprint as trusted.
- Android Receiver does not implement final payment confirmation logic; backend-only decisions remain intentionally unimplemented.
- V1 bank profiles do not include trusted package names or certificate fingerprints.
