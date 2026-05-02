# Current Task

task id: 030_runtime_observability
source task file: tasks/030_runtime_observability.md
status: completed
scope:
Add lightweight runtime observability for SwimPay V1: safe structured logs, correlation IDs, health/status helpers, in-process metrics and admin visibility.

files allowed:
- tasks/030_runtime_observability.md
- .swimpay-agent task queue and reports
- packages/observability
- packages/events observability hooks
- apps/api health/admin metrics instrumentation
- apps/signal-worker safe runtime/health instrumentation
- apps/job-worker safe runtime/health/webhook instrumentation
- docs related to runtime observability, local development and implementation notes

forbidden work:
- Do not implement task 031 or later.
- Do not implement Android Receiver app logic.
- Do not implement production deployment.
- Do not add Prometheus/Grafana, Loki/OpenSearch/Elastic, ClickHouse, Kubernetes or Kafka.
- Do not add real bank package/cert verification.
- Do not implement SBP or PSP behavior.
- Do not claim official bank confirmation.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not weaken auto-confirm gates.
- Do not add unrelated parser, matching, review, webhook or UI features.

acceptance criteria:
- Structured logger redacts phones, raw notifications, API keys and secrets without mutating inputs.
- API health includes safe uptime and timestamp plus dependency status.
- Admin metrics/status endpoint is RBAC protected and safe for read-only operators.
- Runtime metrics cover API order/session creation, signals, reviews, webhooks, NATS and safety counters.
- Worker health/status helpers expose configured consumers and safe status only.
- Tests prove redaction, metric increments, correlation id handling and auth-protected observability endpoints.
- Documentation explains observability behavior and V1 limits.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T17:05:00+03:00
completed_at: 2026-05-02T17:21:45+03:00
result: completed. Added lightweight runtime observability: shared redaction/logger/metrics/status helpers, API health uptime/timestamp, RBAC-protected admin metrics/runtime-status endpoints, in-process counters for API/signal/webhook/NATS paths, expanded Fastify redaction and documentation. Full validation passed.

## Source requirements

See tasks/030_runtime_observability.md.
