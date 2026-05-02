# Next Action

generated_at: 2026-05-02T15:19:08+03:00

## Latest completed task

025_nats_jetstream_consumers is complete.

## Commands run

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`

## Pass/fail status

PASS

## Blockers

No current blockers.

## Next recommended task

026_postgres_webhook_delivery_loop (`tasks/026_postgres_webhook_delivery_loop.md`)

## What not to do next

- Do not push to remote until the user explicitly asks.
- Do not implement parser/matching/review runtime wiring before task 027.
- Do not treat NATS handler stubs as business processing.
- Do not deliver webhooks outside the Postgres-backed loop and signing/idempotency rules.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not create real bank package or certificate values.
- Do not deploy.
- Do not continue after failing checks unless the failure is understood and documented.
