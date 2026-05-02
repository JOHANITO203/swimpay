# Current Task

task id: 025_nats_jetstream_consumers
source task file: tasks/025_nats_jetstream_consumers.md
status: completed
scope:
Add durable NATS JetStream consumer foundations for runtime services without implementing payment-decision changes.

files allowed:
- tasks/025_nats_jetstream_consumers.md
- .swimpay-agent task queue and reports
- packages/events event/NATS foundations and tests
- apps/signal-worker durable consumer skeleton and tests
- apps/job-worker durable consumer skeleton and tests
- docs related to NATS JetStream consumers and local development

forbidden work:
- Do not implement task 026 or later.
- Do not implement parser/matching/review runtime integration.
- Do not implement webhook delivery loop.
- Do not deploy.
- Do not modify production secrets.
- Do not claim official bank confirmation.
- Do not store raw phone numbers.
- Do not store raw notification text by default.

acceptance criteria:
- NATS config parsing, stream config, event envelope validation and consumer helpers are typed and tested.
- Signal/job workers define expected durable consumers.
- Handler wrapper acks success, nacks handler errors and terms invalid/unexpected messages.
- Worker health can report NATS/consumer state.
- No product behavior changes beyond durable consumer scaffolding.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T15:10:00+03:00
completed_at: 2026-05-02T15:19:08+03:00
result: completed

## Source requirements

See tasks/025_nats_jetstream_consumers.md.
