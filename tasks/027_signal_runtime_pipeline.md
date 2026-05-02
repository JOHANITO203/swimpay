# 027 - Signal Runtime Pipeline

## Goal

Wire signed signal ingestion to parser, matching, review, decision and webhook request foundations through durable runtime boundaries.

## Scope

- Connect signal events to deterministic parser and matching-core.
- Persist decisions and review items through PostgreSQL.
- Request webhook delivery through the internal event/outbox path.
- Do not weaken auto-confirm gates.
- Do not implement amount-only confirmation.

## Requirements

- Android captures and signs; backend decides.
- PostgreSQL transactions protect payment state changes.
- NATS JetStream carries internal runtime events.
- Raw phone and raw notification text must not be stored by default.

## Acceptance criteria

- Safe incoming synthetic signal can flow to a decision.
- Ambiguous and unsafe signals create review/reject outcomes as documented.
- Auto-confirm remains blocked for amount-only, cashback, refund, promo, failed, outgoing and unknown directions.
- Tests cover transaction/idempotency behavior.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
