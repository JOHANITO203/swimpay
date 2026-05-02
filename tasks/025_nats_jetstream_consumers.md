# 025 - NATS JetStream Consumers

## Goal

Add durable NATS JetStream consumer foundations for runtime services without implementing payment-decision changes.

## Scope

- Define consumer subjects and durable names.
- Add minimal connection lifecycle and health reporting.
- Ensure handlers are idempotent-ready.
- Do not implement parser, matching, webhook delivery loop, or production deployment in this task.

## Requirements

- Use NATS JetStream, not Kafka.
- Keep PostgreSQL as source of truth.
- Consumers must be safe to retry.
- Failed processing must be observable and not swallowed.

## Acceptance criteria

- Signal/job worker consumer foundations can start locally.
- Consumer config is typed and testable.
- Tests cover subscription configuration and idempotent handler boundaries.
- No product behavior changes beyond runtime event consumption scaffolding.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
