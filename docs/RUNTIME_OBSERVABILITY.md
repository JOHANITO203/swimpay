# Runtime Observability

SwimPay V1 uses lightweight in-process observability for the single-server Docker Compose deployment.

This is intentionally not a monitoring stack. It does not add Prometheus, Grafana, Loki, OpenSearch, Elastic, ClickHouse, Kubernetes or Kafka.

## Structured Logs

`@swimpay/observability` provides a structured logger with:

- service name
- environment
- ISO timestamp
- log level
- message
- optional safe metadata such as `correlation_id`, `event_id`, `merchant_id` and object ids

Sensitive fields are recursively redacted before logging.

Redacted keys include:

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

The existing Fastify logger redaction paths in `@swimpay/security` were also expanded for request-level safety.

## Correlation IDs

API requests accept `X-Correlation-Id`. If it is missing, the API generates one and returns it in `X-Correlation-Id`.

Internal signal runtime events already carry `metadata.correlation_id` from the upstream signal event id where possible.

JetStream consumer logs include safe event metadata, including correlation id when present.

## Health

The API `GET /health` response is safe to expose through the local reverse proxy:

```json
{
  "service": "swimpay-api",
  "version": "0.1.0",
  "environment": "development",
  "dependencies": {
    "database": "ok",
    "nats": "ok",
    "valkey": "ok"
  },
  "uptime_seconds": 42,
  "timestamp": "2026-05-02T12:00:00.000Z"
}
```

Signal worker and job worker health responses include their configured durable consumers and safe worker status. They do not expose secrets, raw phone numbers or raw notification text.

## Metrics

Metrics are in-process JSON counters and gauges. They are suitable for local development and a small V1 server, but they reset on process restart.

Current metrics include:

- `orders_created_total`
- `payment_sessions_created_total`
- `signals_received_total`
- `signals_parsed_total`
- `signals_rejected_total`
- `signals_needs_review_total`
- `signals_auto_confirmed_total`
- `signals_duplicate_total`
- `unsafe_cashback_blocked_total`
- `unsafe_refund_blocked_total`
- `unsafe_outgoing_blocked_total`
- `unsafe_promo_blocked_total`
- `unsafe_failed_blocked_total`
- `amount_only_review_total`
- `untrusted_bank_review_total`
- `reviews_created_total`
- `reviews_confirmed_total`
- `reviews_rejected_total`
- `webhook_deliveries_pending`
- `webhook_deliveries_delivered_total`
- `webhook_deliveries_failed_total`
- `webhook_deliveries_dead_total`
- `webhook_delivery_attempts_total`
- `nats_events_consumed_total`
- `nats_events_acked_total`
- `nats_events_nacked_total`
- `worker_errors_total`
- `template_observed_total`
- `template_drift_detected_total`
- `template_unknown_total`
- `receiver_registrations_total`
- `receiver_heartbeats_total`
- `receiver_signals_accepted_total`
- `receiver_signals_rejected_total`
- `receiver_signature_invalid_total`

## Admin Metrics Endpoint

`GET /v1/admin/metrics` returns:

```json
{
  "metrics": {
    "counters": {},
    "gauges": {}
  }
}
```

It requires operator authentication and `view_admin_dashboard`, which read-only operators have. The endpoint is read-only and returns no raw PII or secrets.

`GET /v1/admin/runtime-status` returns a minimal safe API runtime snapshot with service, environment, uptime and timestamp.

## Worker Status Helpers

`RuntimeStatusTracker` records:

- last processed event id
- last processed timestamp
- last redacted error summary

Webhook queue status helpers can summarize pending, retryable and dead delivery counts without exposing payload data.

## Instrumented Paths

Current instrumentation covers:

- order creation
- payment session creation
- receiver signal ingestion and duplicate signal rejection
- receiver device registration and heartbeat
- receiver contract rejection and invalid receiver signatures
- signal parsing, review, reject and auto-confirm decisions
- unsafe category blocks
- amount-only review routing
- untrusted bank review routing
- review confirm and reject actions
- webhook delivery attempts, delivered, failed and dead outcomes
- JetStream consumed, acked, nacked and worker error counters

Instrumentation does not change payment decision behavior.

## Current Limitations

- Metrics are in-memory only.
- Metrics reset when a process restarts.
- Live NATS/PostgreSQL integration metrics are covered through current runtime abstractions, not a separate live infrastructure test suite.
- No heavy monitoring stack is included in V1.
- Operators should still review Docker logs and database state during local development.
