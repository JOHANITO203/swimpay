# 026 - Postgres Webhook Delivery Loop

## Goal

Connect webhook delivery and retry behavior to a durable PostgreSQL-backed worker loop.

## Scope

- Read pending/retryable webhook deliveries from PostgreSQL.
- Deliver signed webhooks with existing signing rules.
- Persist delivery attempts, retry timing and terminal failures.
- Do not fake payment confirmations.
- Do not call production external services in tests.

## Requirements

- Webhook deliveries must be idempotent by endpoint/event pair.
- Replays must keep event identity stable.
- Secrets must remain hashed or otherwise protected.
- Errors must be recorded without leaking sensitive payloads.

## Acceptance criteria

- Worker can claim due deliveries safely.
- Successful deliveries mark delivered once.
- Failed deliveries schedule bounded retries.
- Tests cover retry, replay and no-duplicate-effects behavior.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
