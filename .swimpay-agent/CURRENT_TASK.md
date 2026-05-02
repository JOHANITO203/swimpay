# Current Task

task id: 026_postgres_webhook_delivery_loop
source task file: tasks/026_postgres_webhook_delivery_loop.md
status: completed
scope:
Add a durable PostgreSQL-backed webhook delivery loop and connect the job worker webhook consumer to it.

files allowed:
- tasks/026_postgres_webhook_delivery_loop.md
- .swimpay-agent task queue and reports
- apps/job-worker webhook delivery, runtime and tests
- packages/database webhook delivery migration/schema exports
- packages/contracts webhook delivery statuses
- packages/events related webhook event constants
- apps/api admin webhook failure status alignment
- docs related to webhook delivery loop and local development

forbidden work:
- Do not implement task 027 or later.
- Do not implement signal/parser/matching/review runtime integration.
- Do not implement Android Receiver logic.
- Do not implement payment auto-confirmation.
- Do not deploy.
- Do not modify production secrets.
- Do not claim official bank confirmation.
- Do not store raw phone numbers.
- Do not store raw notification text by default.

acceptance criteria:
- Pending/failed due webhook deliveries can be claimed safely.
- Successful delivery marks delivered.
- Failed delivery schedules bounded retries and dead state after exhaustion.
- Webhook HTTP requests include signed headers and delivery id.
- NATS `webhook.delivery_requested` invokes the delivery processor.
- Polling loop processes due deliveries only when enabled.
- Payloads reject raw PII field markers.
- No signal runtime pipeline or payment decision behavior is added.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T15:22:00+03:00
completed_at: 2026-05-02T15:37:20+03:00
result: completed

## Source requirements

See tasks/026_postgres_webhook_delivery_loop.md.
