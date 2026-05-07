# SwimPay AGENTS.md

This file gives mandatory instructions to Codex and all AI/code agents working in this repository.

## Project identity

SwimPay is a Payment Signal Engine.

It transforms authorized merchant-side bank notifications into operational payment signals usable by API.

SwimPay is not:

- a bank;
- a PSP;
- an official bank confirmation system;
- an SBP integration;
- a payment initiator;
- a wallet;
- a system that reads the buyer phone;
- a system that reads SMS;
- a system that scrapes banking apps.

## Non-negotiable rule

Never implement logic, text, events or statuses that claim an official bank confirmation.

Use:

- `notification_signal`;
- `payment_signal`;
- `operational_confirmation`;
- `swimpay_recognized`.

Never use:

- `bank_confirmed`;
- truthy official bank confirmation flags;
- `guaranteed_payment`;
- `psp_confirmed`.

All public events must include:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

## V1 scope

Supported banks:

- Sberbank;
- Tinkoff / T-Bank;
- VTB;
- Alfa-Bank;
- Gazprombank.

Deployment:

- one Ubuntu server;
- Docker Compose;
- PostgreSQL;
- Valkey;
- NATS JetStream;
- Caddy or Nginx.

V1 forbidden items:

- no Kubernetes;
- no Kafka;
- no LLM in payment decisions;
- no SBP;
- no PSP;
- no SMS reading;
- no bank app scraping;
- no hidden data collection;
- no iOS Receiver App.

## Architecture style

Use microservice-ready modular design.

Initial deployable services:

- `swimpay-api`;
- `swimpay-signal-worker`;
- `swimpay-job-worker`;
- `swimpay-web`;
- `android-receiver`.

Logical services may exist inside these deployables, but do not create unnecessary runtime containers in V1.

PostgreSQL is the source of truth.

Valkey is only for:

- cache;
- short locks;
- rate limits;
- temporary reservations;
- heartbeat cache.

NATS JetStream is used for durable internal events.

Payment decisions must be protected by PostgreSQL transactions and unique constraints. Do not rely on Valkey locks alone for final payment decisions.

## Required order states

Orders must follow explicit states. Never move directly from `created` to `confirmed`.

Allowed order states:

- `created`;
- `awaiting_buyer_identity`;
- `payment_session_created`;
- `receiver_arming`;
- `receiver_armed`;
- `payment_instructions_shown`;
- `awaiting_payment`;
- `buyer_claimed_paid`;
- `signal_detected`;
- `matching`;
- `needs_review`;
- `manual_confirmed`;
- `rejected`;
- `expired`;
- `fulfilled`.

Every state transition must create an audit event.

## V1 confirmation rules

V1 is manual-confirmation-only.

Strong matches create `needs_review` for the merchant. They never confirm a payment automatically.

Always create `needs_review` or `rejected`.

Never confirm automatically on:

- amount alone;
- cashback;
- refund;
- promo;
- failed transfer;
- outgoing payment;
- unknown direction;
- ambiguous notification;
- untrusted bank app;
- untrusted device.

## Privacy rules

Do not store raw notification text unless explicitly required for short-lived debugging and redacted.

Phone numbers must be:

- normalized;
- HMACed for matching;
- masked in dashboard.

Use redacted placeholders:

- `<AMOUNT>`;
- `<CURRENCY>`;
- `<PHONE>`;
- `<PERSON>`;
- `<REFERENCE>`;
- `<CARD_MASK>`.

Never upload notifications from non-allowed apps.

## Android rule

Android captures, filters, extracts, redacts, signs and uploads.

Backend decides.

Never implement final payment confirmation on Android.

## Testing rules

Every feature must include tests.

Minimum required tests:

- unit tests for pure logic;
- integration tests for API endpoints;
- matching tests for payment decisions;
- parser tests for bank notification formats;
- anti-replay tests;
- webhook idempotency tests;
- state machine transition tests.

Before finalizing a task, run the relevant commands:

- typecheck;
- lint;
- tests;
- build.

If a command cannot be run, explain why in the final response.

## Coding rules

- Use explicit types.
- Do not silently swallow errors.
- Do not use magic strings for statuses or event names; use enums/constants.
- Do not duplicate matching logic across services.
- Keep payment decision logic deterministic and auditable.
- Emit reason codes for every decision.
- Update docs when changing major behavior.

## Required files to read before coding

Before implementing a task, read:

- `AGENTS.md`;
- relevant `tasks/*.md` file;
- `docs/02_SYSTEM_ARCHITECTURE.md`;
- `docs/05_DATABASE_SCHEMA.md` if DB is touched;
- `docs/10_MATCHING_AND_SCORING.md` if matching/decision logic is touched;
- `docs/11_SECURITY_AND_PRIVACY.md` if sensitive data/auth/security is touched.
