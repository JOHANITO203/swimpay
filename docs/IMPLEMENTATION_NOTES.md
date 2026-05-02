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

Task 017 added a minimal operator admin API foundation. It exposes bank profile status, template registry, drift events, webhook failures, receiver health, and audit search endpoints under `/v1/admin/*` with a local operator bearer placeholder. It also supports degrading a bank template or moving it to `review_only`, and every template action writes a redacted operator audit event.

Task 023 extended the admin foundation with bank-template-specific actions: promote, degrade, review-only, disable, and mark false positive. Promotion to trusted statuses is blocked when false positives exist, when evidence thresholds are not met, or when the bank app package/certificate metadata is still unverified or `TO_VERIFY`. Disable and false-positive actions immediately make the template ineligible for auto-confirm candidates and write redacted operator audit events.

Task 024 added a Phase 2 operator auth/RBAC foundation. `@swimpay/security` now defines operator roles, permissions, role-permission mappings, dev-token verification, HMAC-signed operator token verification, and permission checks. Admin endpoints now reject missing auth, reject `Bearer admin_<operator_id>` placeholders, require explicit permissions for reads and dangerous template actions, and use the authenticated operator id for audit events. Local development can use `ADMIN_AUTH_MODE=dev_token` with a configured `DEV_ADMIN_TOKEN`; production must use signed-token mode or a future identity provider and cannot rely on the dev placeholder path.

Task 025 added the NATS JetStream durable consumer foundation. `@swimpay/events` now owns NATS runtime config parsing, the `SWIMPAY_EVENTS` stream definition, internal runtime event envelope validation, durable consumer definitions, explicit ack/nack/term message processing, publish/connect/close helpers, and safe event metadata logging. Signal worker now registers stub consumers for `signal.received`, `signal.verified`, `signal.parsed`, and `match.scored`; job worker registers stub consumers for `webhook.delivery_requested`, `order.expired`, and `payment_session.expired`. These handlers acknowledge known events only and intentionally do not run parser, matching, review creation, or webhook delivery logic yet.

Task 026 added a durable PostgreSQL-backed webhook delivery loop. Webhook deliveries now support explicit `pending`, `delivering`, `delivered`, `failed`, `dead`, and `cancelled` statuses, payload JSON, max attempts, HTTP status capture, updated timestamps and replay linkage. The job worker's `webhook.delivery_requested` consumer can process a specific delivery or all due deliveries for an event, and an optional fallback polling loop can process due rows when `WEBHOOK_WORKER_ENABLED=true`. Delivery uses signed SwimPay webhook headers including `SwimPay-Delivery-Id`, bounded retries, sanitized errors and redacted audit events.

Task 027 added the signal runtime pipeline foundation. `swimpay-signal-worker` now wires the durable `signal.received` consumer into a deterministic processor that loads signal rows, parses redacted notification text with `@swimpay/bank-templates`, scores/matches candidates with `@swimpay/matching-core`, records rejected/review/auto-confirm decisions, writes redacted audit events, and requests safe public webhook delivery events. `TO_VERIFY` and pending bank app metadata cannot auto-confirm; amount-only and negative categories remain blocked.

Task 028 clarified manual review rejection semantics. Review rejection now has explicit scopes: `signal`, `payment_session`, and `order`. The default `signal` scope rejects only the review and linked notification signal, leaving the order and payment session active. Session/order rejection requires explicit scope, writes additional redacted audit events, and repeated same-scope rejection is idempotent.

Task 029 added durable worker E2E stabilization tests. The new in-process suite covers API order/session creation, receiver signal ingestion, `signal.received` consumer processing, untrusted bank-app review routing, amount-only and unsafe category protections, trusted synthetic auto-confirmation, webhook delivery through the job-worker handler, collision review, duplicate signal idempotency, review rejection semantics, webhook retry/dead behavior and invalid worker envelope handling. The suite uses local fakes for repositories, event publishing and HTTP delivery; it does not call external services or live NATS/PostgreSQL.

Task 030 added lightweight runtime observability. A new `@swimpay/observability` package provides recursive sensitive-field redaction, structured log entries, in-process counters/gauges, safe health snapshots, worker status tracking, and webhook queue summaries. The API health endpoint now includes uptime and timestamp, API responses include a correlation id header, and RBAC-protected admin endpoints expose safe metrics and runtime status. API, signal runtime, webhook delivery and JetStream consumer wrappers now increment observability counters without changing payment decision behavior.

Task 031 added the Android Receiver contract validation foundation. `@swimpay/contracts` now defines receiver registration, heartbeat, notification snapshot, coalescing and signed signal upload DTOs, validation helpers, canonical signed payload generation and backend error codes. The API receiver endpoints now use these contracts, reject raw phone/raw notification fields, require signed uploads, preserve `TO_VERIFY` package/cert metadata as untrusted, return safe receiver responses and increment receiver observability counters. This task did not build the Android app or implement real bank package/certificate verification.

Task 032 hardened receiver signature verification. The supported receiver signature algorithm is now explicit as `hmac_sha256_canonical_v1`, signature verification returns a typed result, unknown devices increment rejection metrics, and devices in `suspended`, `revoked`, or `disabled` status are blocked from signal upload before persistence. The safe testable verifier still uses the registered receiver public key field as the deterministic verification key; production-grade asymmetric verification remains a future hardening item with no bypass path.

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
- Workers expose health endpoints. The signal worker now processes `signal.received`; other signal consumers remain safe stubs until later runtime tasks.
- Web now serves a hosted checkout foundation at `GET /checkout/:paymentSessionId`, with summary, buyer identity, payment instructions, waiting status, result text, timer, copy buttons, open-bank placeholder, and a safe `J'ai paye` button.
- Web exposes `GET /checkout/:paymentSessionId/status` for checkout polling and `POST /checkout/:paymentSessionId/claimed-paid` as a non-confirming buyer claim endpoint.
- `J'ai paye` does not confirm payment and only moves the local checkout UI toward waiting for the merchant-side signal.
- Web is not yet a merchant dashboard or admin console.
- Android Receiver now has a TypeScript foundation core under `apps/android-receiver` for allowlist filtering, notification snapshot extraction, redaction, encrypted outbox persistence, signed upload envelope creation, and heartbeat payload construction.
- Android Receiver is not yet a full Android/Gradle app and does not request Android permissions or run a platform notification listener in this foundation step.
- Android Receiver backend contracts are now documented in `docs/ANDROID_RECEIVER_CONTRACT.md` and enforced by shared TypeScript validators for registration, heartbeat, redacted snapshot DTOs, coalescing metadata and signed signal uploads.
- Receiver signal upload rejects raw phone fields, raw notification text, missing signatures, invalid timestamps, invalid currency and invalid minor-unit amounts before persistence.
- Signal ingestion now supports `POST /v1/receiver/signals` with device existence checks, deterministic foundation signature verification, duplicate `event_id` rejection, duplicate `notification_hash` rejection, local counter regression rejection, bank profile checks, pending bank app signature observation, redacted audit storage, and `signal.received` publication through the internal event publisher.
- The current signal signature verifier uses the registered receiver `public_key` field as a local deterministic verification key for this foundation. Real Android keypair verification is intentionally left for security hardening.
- Bank templates now include a deterministic V1 parser foundation for Russian notification text: amount/currency extraction, Russian phone normalization, SwimPay reference extraction, direction classification, negative keyword gates, signal quality scoring, and V1 bank profiles in `learning` status.
- Parser directions separate customer transfers from cashback, refunds, outgoing payments, promos, failed transfers, balance updates, and unknown signals.
- Matching core now includes a deterministic pure function for candidate search, exact amount/currency matching, phone/reference matching, time-window checks, collision detection, score computation, and internal decision output.
- Matching core blocks amount-only auto-confirmation, duplicate signal reuse, double-confirming an order, unsafe directions, and unresolved collisions.
- Review queue foundation now supports `GET /v1/reviews`, `POST /v1/reviews/:id/confirm`, and `POST /v1/reviews/:id/reject`.
- Review creation is available as a backend foundation helper/repository method for ambiguous `needs_review` matches.
- Manual review confirmation updates order and payment session state to `manual_confirmed`, records a review action, writes redacted audit data, persists a manual match, and emits an internal `review.confirmed` event with notification-signal disclosure fields.
- Manual review rejection defaults to `signal` scope: it rejects the review and linked signal only, records a scoped review action, writes redacted audit data, and emits an internal `review.rejected` event. Explicit `payment_session` or `order` scope is required to reject those linked resources.
- Matching core is now wired into the signal-worker `signal.received` pipeline for runtime decisions.
- Review creation is now wired from live signal runtime decisions and remains protected by redacted payloads.
- Webhook worker foundation now includes public payment event creation, required notification-signal disclosure fields, HMAC signing, SwimPay webhook headers, retry scheduling, duplicate endpoint/event prevention, delivery status updates, and replay with the original event id.
- Webhook worker tests use an injectable HTTP client and in-memory repository; no production external calls are made during tests.
- The webhook worker is now connected to the NATS `webhook.delivery_requested` trigger and a Postgres-backed delivery loop.
- Signal worker handles `signal.received` through the runtime processor. `signal.verified`, `signal.parsed`, and `match.scored` consumers remain stubs because they are not independent business entrypoints yet.
- End-to-end tests now cover the foundation signal flow across matching-core and webhook worker primitives, including unsafe-path protections. Task 029 extends this with durable in-process worker E2E coverage across API routes, signal runtime, review rejection semantics, webhook delivery and consumer wrappers. These tests still do not replace future live PostgreSQL/NATS integration tests.
- Runtime observability is in-process and lightweight. It provides safe JSON metrics, health/status snapshots, expanded log redaction, API correlation ids, worker processed/error summaries and queue status helpers. It does not add Prometheus, Grafana, Loki, OpenSearch, Elastic, ClickHouse or other heavy monitoring infrastructure.
- Receiver signal signature handling now uses a typed `hmac_sha256_canonical_v1` verification result, blocks unknown and disabled receiver devices before persistence, and preserves local counter replay protection. The current verifier is a safe deterministic foundation around registered device verification keys; production-grade asymmetric receiver keys remain a future hardening item.
- Local Docker runtime smoke checks are available through `npm run smoke:runtime`. The checker validates the Compose config from `.env.example`, confirms PostgreSQL/Valkey/NATS stay private, checks API/worker/web healthcheck definitions and keeps Docker log rotation visible. This is a local smoke guard only; it does not deploy to production or replace future live NATS/PostgreSQL integration tests.
- Backend receiver signal live-flow tests now assert that synthetic `TO_VERIFY` uploads are stored and emitted as `signal.received`, then route to review through backend runtime processing. API `accepted: true` means `backend_decision_pending` only and does not include official bank confirmation wording.
- Bank app package/certificate verification now has a guarded admin workflow. Operators can list observed metadata and admins can verify non-`TO_VERIFY` synthetic observations through an RBAC-protected, audited endpoint. `TO_VERIFY` package/cert metadata cannot become trusted automatically, and responses expose masked certificate hashes only.
- Sprint 3B added the Android Receiver MVP foundation. `apps/android-receiver` now has a Kotlin-source-ready skeleton, config placeholders, a TypeScript listener boundary, allowlist/package verification model, notification snapshot extractor, coalescer, privacy firewall and local parser hints. Android still never confirms or auto-confirms payment, and examples use synthetic package/cert values only. Gradle/Android platform tests are not available in this repo yet.
- Sprint 3C added receiver lifecycle clients for device registration, signed heartbeat and signed redacted signal upload. It also added a platform-neutral encrypted outbox retry model, safe health warning derivation, a local receiver smoke-plan helper and Android Gradle readiness documentation. Gradle/Android platform tests are still unavailable because no Gradle wrapper or Android SDK build configuration exists in this repo.
- Sprint 3D added Android Gradle project files, a manifest with NotificationListenerService binding, a safe status screen/model, Android Keystore signer skeleton, encrypted outbox platform boundary, WorkManager upload retry skeleton, emulator smoke documentation and Android MVP closeout review. Java and Android SDK are present locally, but Gradle is not available in PATH and no wrapper JAR is checked in, so Android assemble was not run.
- Sprint 4A added explicit Android toolchain diagnostics, Gradle wrapper policy, JVM unit test planning and build closeout reporting. Java and Android SDK are available locally; Gradle and the Gradle wrapper are unavailable, so `assembleDebug` remains blocked and is not claimed as passed.
- Sprint 4B generated a trusted Gradle wrapper using an official Gradle `8.11.1` distribution verified by SHA256, enabled AndroidX, aligned Java/Kotlin target 17, added Android JVM tests, and validated `:app:assembleDebug` plus `:app:testDebugUnitTest`.
- Admin console foundation is API-only for now. It supports RBAC-protected operational views and audited template actions; it does not include a browser UI, a full operator identity provider, real app package/cert verification workflow, unsafe bulk actions, or raw PII access.
- Bank template admin controls now support promotion, degradation, review-only, disable, and false-positive marking through API endpoints. Promotion is guarded by RBAC, evidence thresholds and verified bank app metadata; the console still does not verify real package/cert values or create a browser UI.
- No official bank confirmation wording or status was introduced.
- Receiver registration does not mark any bank package name or certificate fingerprint as trusted.
- Android Receiver does not implement final payment confirmation logic; backend-only decisions remain intentionally unimplemented.
- V1 bank profiles do not include trusted package names or certificate fingerprints.
