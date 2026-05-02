# Task 030 - Runtime Observability Report

## Status

Completed.

Local commit:

```text
7676d2b task 030: runtime observability
```

## Scope

Task 030 added lightweight runtime observability for SwimPay V1 single-server development and guarded local operation.

This task did not add product features and did not change payment decision rules.

## Files Created

- `packages/observability/package.json`
- `packages/observability/tsconfig.json`
- `packages/observability/src/index.ts`
- `packages/observability/src/index.test.ts`
- `docs/RUNTIME_OBSERVABILITY.md`
- `.swimpay-agent/TASK_030_RUNTIME_OBSERVABILITY_REPORT.md`

## Main Files Updated

- `apps/api/src/server.ts`
- `apps/api/src/health.test.ts`
- `apps/api/src/orders.test.ts`
- `apps/signal-worker/src/index.ts`
- `apps/signal-worker/src/runtime.ts`
- `apps/signal-worker/src/runtime.test.ts`
- `apps/job-worker/src/index.ts`
- `apps/job-worker/src/webhooks.ts`
- `apps/job-worker/src/webhooks.test.ts`
- `packages/events/src/index.ts`
- `packages/events/src/jetstream.test.ts`
- `packages/security/src/index.ts`
- `packages/security/src/index.test.ts`
- `docs/IMPLEMENTATION_NOTES.md`
- `docs/LOCAL_DEVELOPMENT.md`
- `.swimpay-agent/CURRENT_TASK.md`
- `.swimpay-agent/PROGRESS_LOG.md`
- `.swimpay-agent/NEXT_ACTION.md`
- `.swimpay-agent/BLOCKERS.md`
- `.swimpay-agent/PHASE_2_RUNTIME_PLAN.md`

## Observability Package

Added `@swimpay/observability`.

It provides:

- recursive sensitive-field redaction
- structured log entry creation
- in-memory counters and gauges
- safe health snapshot builder
- worker runtime status tracker
- webhook queue summary helper

The metrics registry is intentionally in-process and lightweight. Metrics reset on process restart.

## Logging And Redaction

Structured logs support:

- service name
- environment
- timestamp
- log level
- message
- safe ids such as `correlation_id`, `event_id`, `merchant_id`

Sensitive fields are redacted recursively.

Redacted examples:

- `phone`
- `raw_phone`
- `buyer_phone`
- `sender_phone`
- `normalized_phone`
- `notification_text`
- `raw_notification`
- `raw_body`
- `raw_title`
- `api_key`
- `secret`
- `token`
- `password`
- `signature`

Existing Fastify log redaction in `@swimpay/security` was also strengthened.

## Correlation IDs

The API now:

- accepts `X-Correlation-Id`
- generates one if missing
- returns it as `X-Correlation-Id`

Signal runtime events already carry `metadata.correlation_id` where possible.

JetStream logs include safe event metadata, including correlation id when present.

## Health And Status

The API health endpoint now returns:

- service
- version
- environment
- PostgreSQL status
- NATS status
- Valkey status
- uptime
- timestamp

Added admin-only read endpoints:

- `GET /v1/admin/metrics`
- `GET /v1/admin/runtime-status`

Both require existing operator RBAC permission `view_admin_dashboard`.

Read-only operators can view metrics.

## Metrics Added

API/order:

- `orders_created_total`
- `payment_sessions_created_total`

Signal runtime:

- `signals_received_total`
- `signals_parsed_total`
- `signals_rejected_total`
- `signals_needs_review_total`
- `signals_auto_confirmed_total`
- `signals_duplicate_total`

Safety:

- `unsafe_cashback_blocked_total`
- `unsafe_refund_blocked_total`
- `unsafe_outgoing_blocked_total`
- `unsafe_promo_blocked_total`
- `unsafe_failed_blocked_total`
- `amount_only_review_total`
- `untrusted_bank_review_total`

Review:

- `reviews_created_total`
- `reviews_confirmed_total`
- `reviews_rejected_total`

Webhook:

- `webhook_deliveries_pending`
- `webhook_deliveries_delivered_total`
- `webhook_deliveries_failed_total`
- `webhook_deliveries_dead_total`
- `webhook_delivery_attempts_total`

NATS/worker:

- `nats_events_consumed_total`
- `nats_events_acked_total`
- `nats_events_nacked_total`
- `worker_errors_total`

Bank templates:

- `template_observed_total`
- `template_drift_detected_total`
- `template_unknown_total`

## Instrumented Runtime Paths

Instrumentation was added to:

- order creation
- payment session creation
- signal ingestion duplicate detection
- signal parsing
- signal rejection
- signal review routing
- signal auto-confirm outcome
- unsafe category blocking
- amount-only review routing
- untrusted bank review routing
- review confirmation
- review rejection
- webhook delivery attempts
- webhook delivered/failed/dead outcomes
- JetStream consumed/acked/nacked/error handling

## Safety And Privacy

Confirmed safeguards:

- no raw phone storage was introduced
- no raw notification storage was introduced
- no raw PII is exposed in metrics
- no secrets are exposed in health responses
- no official bank confirmation wording was introduced
- no PSP/SBP behavior was introduced
- no matching or payment confirmation gates were weakened
- no heavy monitoring stack was added

## Tests Added Or Updated

Added coverage for:

- nested sensitive-field redaction
- redaction without mutating the original object
- structured log entry safe metadata
- metrics counters and gauges
- safe health response with uptime/timestamp
- admin metrics endpoint requiring auth
- read-only operator access to metrics
- API order/session counters
- signal runtime counters
- unsafe category counters
- duplicate signal counter
- webhook delivery counters
- JetStream ack/nack/error counters
- expanded security log redaction

## Validation

All required checks passed:

```text
npm run typecheck
npm run lint
npm test
npm run build
docker compose --env-file .env.example -f infra/docker-compose.yml config
```

Full test result:

```text
29 test files passed
177 tests passed
```

## Intentionally Not Implemented

Not implemented in this task:

- Prometheus
- Grafana
- Loki
- OpenSearch
- Elastic
- ClickHouse
- live NATS/PostgreSQL integration observability tests
- Android Receiver app logic
- production deployment
- parser or matching rule changes
- payment confirmation behavior changes

## Next Recommended Task

`031_android_receiver_contract_validation`

Goal: validate the Android Receiver contract while preserving the rule that Android captures, filters, redacts, signs and uploads signals, and the backend decides.
