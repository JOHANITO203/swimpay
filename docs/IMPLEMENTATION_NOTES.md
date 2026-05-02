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

- API exposes `/health`, `POST /v1/orders`, and `GET /v1/orders/:id`.
- Order API authentication is a local foundation placeholder: `Authorization: Bearer test_<merchant_id>`. Real hashed API key validation is still intentionally not implemented.
- Order creation creates an order, a receiver-arming payment session placeholder, and a redacted audit event.
- Payment session creation now records redacted audit events for `payment_session.created` and `payment_session.receiver_arming_requested`.
- `GET /v1/payment-sessions/:id` returns checkout session status and reports expired sessions after `valid_until`.
- Receiver device registration now supports `POST /v1/receiver-devices/register` and stores public key, app version, Android version, initial trust score, and a redacted registration audit event.
- Receiver heartbeat now supports `POST /v1/receiver-devices/heartbeat` and updates notification access state, health status, app version, and last heartbeat time.
- Workers only expose health endpoints and do not process jobs.
- Web is a minimal health/static foundation, not hosted checkout or dashboard.
- Android Receiver now has a TypeScript foundation core under `apps/android-receiver` for allowlist filtering, notification snapshot extraction, redaction, encrypted outbox persistence, signed upload envelope creation, and heartbeat payload construction.
- Android Receiver is not yet a full Android/Gradle app and does not request Android permissions or run a platform notification listener in this foundation step.
- Signal ingestion now supports `POST /v1/receiver/signals` with device existence checks, deterministic foundation signature verification, duplicate `event_id` rejection, duplicate `notification_hash` rejection, local counter regression rejection, bank profile checks, pending bank app signature observation, redacted audit storage, and `signal.received` publication through the internal event publisher.
- The current signal signature verifier uses the registered receiver `public_key` field as a local deterministic verification key for this foundation. Real Android keypair verification is intentionally left for security hardening.
- Bank templates now include a deterministic V1 parser foundation for Russian notification text: amount/currency extraction, Russian phone normalization, SwimPay reference extraction, direction classification, negative keyword gates, signal quality scoring, and V1 bank profiles in `learning` status.
- Parser directions separate customer transfers from cashback, refunds, outgoing payments, promos, failed transfers, balance updates, and unknown signals.
- Matching core now includes a deterministic pure function for candidate search, exact amount/currency matching, phone/reference matching, time-window checks, collision detection, score computation, and internal decision output.
- Matching core blocks amount-only auto-confirmation, duplicate signal reuse, double-confirming an order, unsafe directions, and unresolved collisions.
- Matching core is not yet wired into the signal worker, database match persistence, review queue creation, webhook delivery, or any public payment confirmation flow.
- No official bank confirmation wording or status was introduced.
- Receiver registration does not mark any bank package name or certificate fingerprint as trusted.
- Android Receiver does not implement final payment confirmation logic; backend-only decisions remain intentionally unimplemented.
- V1 bank profiles do not include trusted package names or certificate fingerprints.
