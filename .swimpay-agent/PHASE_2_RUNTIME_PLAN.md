# Phase 2 Durable Runtime Integration Plan

created_at: 2026-05-02T14:47:23+03:00

## Goal

Move SwimPay from a validated foundation into durable local runtime integration while preserving strict payment-safety, privacy and deployment guardrails.

## Queue

1. `024_operator_auth_and_admin_rbac`
2. `025_nats_jetstream_consumers`
3. `026_postgres_webhook_delivery_loop`
4. `027_signal_runtime_pipeline`
5. `028_review_rejection_semantics`
6. `029_durable_worker_e2e_tests`
7. `030_runtime_observability`
8. `031_android_receiver_contract_validation`

## Dependency Notes

- Operator auth/RBAC must happen before exposing more admin controls.
- NATS consumers and the Postgres webhook delivery loop can be built independently, but both are needed before the full signal runtime pipeline is durable.
- Review rejection semantics should be clarified before broader E2E coverage asserts final order/session behavior.
- Runtime observability should stay lightweight for the 2 GB single-server target.
- Android receiver contract validation must keep Android as capture/sign/upload only; backend decisions remain authoritative.

## Guardrails

- Do not deploy.
- Do not implement PSP, SBP, bank API, SMS reading or bank-app scraping.
- Do not claim official bank confirmation.
- Do not use LLMs in payment decisions.
- Do not store raw phone numbers or raw notification text by default.
- Do not expose admin endpoints with placeholder authentication.
- Do not trust TO_VERIFY package names or certificate fingerprints.

## Task 024 Result

`024_operator_auth_and_admin_rbac` replaces placeholder admin auth with centralized roles, permissions, dev-token auth, signed-token verification and route-level permission checks. Further tasks must build on this RBAC foundation instead of reintroducing `Bearer admin_<operator_id>` placeholders.

## Task 025 Result

`025_nats_jetstream_consumers` adds the durable NATS JetStream foundation. `@swimpay/events` now owns NATS config parsing, `SWIMPAY_EVENTS` stream metadata, runtime event envelope validation, publish/connect/close helpers, durable consumer definitions and explicit ack/nack/term message processing. Signal worker and job worker register safe stub consumers and expose NATS/consumer health metadata. Further tasks must add real business handlers through this shared abstraction instead of embedding NATS logic directly in services.

## Task 026 Result

`026_postgres_webhook_delivery_loop` adds the durable webhook delivery loop. Webhook deliveries are claimed from PostgreSQL using due-row status checks and `FOR UPDATE SKIP LOCKED`, processed with signed HTTP POST requests, retried on bounded schedules, marked `dead` after exhaustion, and audited with redacted metadata. The job worker now handles `webhook.delivery_requested` by `delivery_id` or `event_id`, while a disabled-by-default polling loop can recover due deliveries after missed events or restarts.

## Task 027 Result

`027_signal_runtime_pipeline` connects the durable `signal.received` consumer to the signal runtime processor. The processor parses redacted notification fields with the bank-template parser, uses matching-core for candidate scoring, creates review/reject/auto-confirm outcomes, writes redacted audit events, and requests webhook delivery records. Strict gates still block amount-only, unsafe directions, TO_VERIFY/pending app metadata, untrusted templates, untrusted devices and collisions from auto-confirmation.

## Task 028 Result

`028_review_rejection_semantics` clarifies review rejection scope. `POST /v1/reviews/:id/reject` now defaults to `signal`, which rejects only the review and linked signal while leaving the order and payment session active. Explicit `payment_session` and `order` scopes are supported, same-scope retries are idempotent, conflicting scope escalation returns a clear conflict, and redacted audit events record the resulting state changes. Signal-scope rejection remains internal and does not create a public `payment.rejected` webhook by default.

## Task 029 Result

`029_durable_worker_e2e_tests` adds an in-process durable E2E suite across API order/session creation, receiver signal ingestion, `signal.received` processing, signal runtime review/reject/auto-confirm decisions, review rejection API semantics, webhook delivery/retry/dead behavior, and worker consumer wrappers. The suite uses local repositories and a mocked HTTP client, so no external network services, live NATS or production database are required. It asserts notification-signal disclosure fields, blocks unsafe categories and amount-only auto-confirmation, and checks that raw phone, raw notification text, raw API keys and official-bank-confirmation claims are not exposed.

## Task 030 Result

`030_runtime_observability` adds lightweight in-process observability for the V1 single-server runtime. `@swimpay/observability` now provides recursive sensitive-field redaction, structured logs, counters/gauges, health snapshots, worker status tracking and webhook queue summaries. API health includes uptime and timestamp, API responses carry `X-Correlation-Id`, admin metrics/runtime status endpoints are protected by existing RBAC, and API, signal runtime, webhook delivery and JetStream paths increment safe counters. No heavy monitoring stack was added.
