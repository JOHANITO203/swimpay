# Durable Worker E2E Tests

Task: `029_durable_worker_e2e_tests`

## Purpose

The durable worker E2E suite stabilizes the Phase 2 runtime path across API boundaries, signal-worker runtime decisions, review semantics, webhook delivery and worker consumer abstractions.

These tests are local and in-process. They do not call external merchant endpoints, live NATS, production databases or Android platform APIs.

## Covered Flows

The suite lives in:

```bash
tests/durable-worker-e2e.test.ts
```

It covers:

- API order creation and payment session creation.
- Receiver signal ingestion with synthetic signed data.
- `signal.received` processing through the shared JetStream consumer wrapper.
- Signal runtime routing for untrusted `TO_VERIFY` bank app metadata.
- Amount-only signals never auto-confirming.
- Unsafe categories never auto-confirming:
  - cashback
  - refund
  - outgoing payment
  - promo
  - failed transfer
  - unknown direction
- Trusted synthetic happy path auto-confirmation.
- Public webhook delivery creation and signed delivery through the job-worker handler path.
- Collision routing to review.
- Duplicate signal/event id protection.
- Runtime idempotency for repeated signal processing.
- Review rejection semantics through the API:
  - default signal-scope rejection
  - explicit order-scope rejection
- Webhook retry and terminal `dead` behavior.
- Invalid worker envelope handling through ack/nack/term abstractions.

## Mocked Components

The test suite intentionally uses local fakes for:

- order repository
- receiver signal repository
- review repository
- event publisher
- webhook HTTP client
- webhook repository

The signal runtime processor, webhook delivery worker, API route handlers and JetStream message wrapper are real application code.

This keeps the suite fast and deterministic while still testing the key runtime boundaries. Live PostgreSQL/NATS integration remains a future deployment/integration test layer.

## Safety Assertions

The tests assert that payloads and responses do not expose:

- raw buyer phone numbers
- raw notification text
- raw API keys
- `official_bank_confirmation: true`
- forbidden confirmation wording such as `bank_confirmed`, `guaranteed_payment` or `psp_confirmed`

Public payment webhook payloads must keep:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

## How To Run

Run only the durable worker E2E suite:

```bash
npm test -- --run tests/durable-worker-e2e.test.ts
```

Run the full local validation set:

```bash
npm run typecheck
npm run lint
npm test
npm run build
docker compose --env-file .env.example -f infra/docker-compose.yml config
```

## Limitations

This task does not add:

- live NATS server tests
- live PostgreSQL migration/integration tests
- Android Receiver platform tests
- production deployment checks
- real bank package or certificate verification
- PSP/SBP behavior
- SMS reading
- bank app scraping
- official bank confirmation behavior

Those remain outside the task 029 scope.
