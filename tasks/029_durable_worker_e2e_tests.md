# 029 - Durable Worker E2E Tests

## Goal

Add durable end-to-end tests for the runtime worker path across API, database, NATS, signal processing, reviews and webhooks.

## Scope

- Exercise local test infrastructure only.
- Use synthetic redacted data.
- Avoid production external calls.
- Do not add new product features beyond tests and test harness support.

## Requirements

- Cover order/session creation, signal ingestion, parser/matching, review and webhook request paths.
- Prove duplicate signals and duplicate confirmations are rejected.
- Prove unsafe directions never auto-confirm.

## Acceptance criteria

- E2E tests run locally with documented commands.
- Tests fail meaningfully on broken durable runtime integration.
- No raw phone numbers or raw notification text are stored by default.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
