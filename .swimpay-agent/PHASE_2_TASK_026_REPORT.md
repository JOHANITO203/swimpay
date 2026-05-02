# Phase 2 Task 026 Report - Postgres Webhook Delivery Loop

generated_at: 2026-05-02T15:37:20+03:00

## Task

`026_postgres_webhook_delivery_loop`

## Status

Completed.

Local commit:

```text
ac319b3 task 026: postgres webhook delivery loop
```

Branch:

```text
agent-autonomous-run
```

## Goal

Implement a durable PostgreSQL-backed webhook delivery loop for SwimPay's job worker.

The task connects the existing webhook foundation to durable delivery state, bounded retries, signed HTTP delivery, NATS `webhook.delivery_requested` handling and a safe fallback polling loop.

## Scope Implemented

### Durable Webhook Delivery Model

Webhook deliveries now support explicit durable statuses:

```text
pending
delivering
delivered
failed
dead
cancelled
```

Status meaning:

- `pending`: ready for first delivery attempt.
- `delivering`: claimed by one worker.
- `delivered`: terminal successful delivery after a 2xx response.
- `failed`: retryable failure with `next_retry_at`.
- `dead`: terminal failure after retry attempts are exhausted.
- `cancelled`: terminal state for inactive or cancelled endpoint handling.

The delivery model now supports:

- delivery id;
- merchant id;
- endpoint id;
- event id;
- event type;
- payload hash;
- safe payload JSON;
- status;
- attempt count;
- max attempts;
- next retry timestamp;
- sanitized last error;
- last HTTP status;
- created timestamp;
- delivered timestamp;
- updated timestamp;
- replay linkage.

### Database Migration

Added:

```text
packages/database/migrations/002_webhook_delivery_loop.sql
```

The migration adds:

- `payload_json`;
- `max_attempts`;
- `last_http_status`;
- `updated_at`;
- `replay_of_delivery_id`;
- durable status check;
- retryable due-row index;
- replay-safe endpoint/event uniqueness.

The original endpoint/event uniqueness is replaced with a partial unique index:

```text
endpoint_id + event_id
WHERE replay_of_delivery_id IS NULL
```

This keeps normal delivery idempotent while allowing explicit replay to create a new delivery id with the same public event id.

### Safe Claiming

The Postgres repository claims due rows using transactional row locking:

```sql
FOR UPDATE SKIP LOCKED
```

Claimable rows must satisfy:

- status is `pending` or `failed`;
- `next_retry_at` is null or due;
- `attempt_count < max_attempts`.

Claimed rows move to:

```text
delivering
```

PostgreSQL remains the source of truth. Valkey is not used as a delivery lock.

### HTTP Delivery

Webhook delivery sends a POST request to the endpoint URL with stable JSON payload bytes.

Headers now include:

```text
Content-Type: application/json
SwimPay-Event-Id
SwimPay-Delivery-Id
SwimPay-Timestamp
SwimPay-Signature
```

Signature behavior remains compatible with existing docs:

```text
HMAC-SHA256 over <timestamp>.<raw_payload>
```

The HTTP client:

- uses a required timeout;
- does not automatically follow redirects;
- records HTTP status when available;
- records sanitized errors;
- does not log or expose full sensitive payloads.

### Retry Policy

Implemented bounded deterministic retry scheduling:

```text
attempt 1: immediate
attempt 2: +1 min
attempt 3: +5 min
attempt 4: +15 min
attempt 5: +1 h
attempt 6: +6 h
attempt 7: +24 h
```

Behavior:

- 2xx response: `delivered`.
- 4xx/5xx/network error/timeout with attempts remaining: `failed` with `next_retry_at`.
- attempts exhausted: `dead`.
- inactive endpoint: `cancelled`.

No infinite retries are implemented.

### NATS Integration

The job worker now connects `webhook.delivery_requested` to the durable delivery processor.

The event data may include:

```json
{
  "delivery_id": "del_01",
  "event_id": "evt_public_01"
}
```

Behavior:

- if `delivery_id` is present, process that due delivery;
- if only `event_id` is present, process due deliveries for that event;
- invalid event data is rejected by the handler;
- the shared JetStream consumer wrapper controls ack/nack/term behavior.

Order expiry and payment session expiry consumers remain safe stubs.

### Fallback Polling Loop

Added a fallback polling loop in:

```text
apps/job-worker/src/webhook-runtime.ts
```

Environment variables:

```text
WEBHOOK_WORKER_ENABLED=false
WEBHOOK_POLL_INTERVAL_MS=30000
WEBHOOK_WORKER_BATCH_SIZE=10
WEBHOOK_MAX_ATTEMPTS=7
WEBHOOK_REQUEST_TIMEOUT_MS=5000
WEBHOOK_RETRY_BASE_DELAY_MS=60000
WEBHOOK_RETRY_MAX_DELAY_MS=86400000
```

The loop is disabled by default and only processes due deliveries when explicitly enabled.

### Replay Foundation

Replay behavior remains internal/helper-level in this task.

Replay:

- keeps the original public event id;
- creates a new delivery id;
- records redacted audit metadata;
- does not mutate the original payload unsafely.

No public/admin replay endpoint was added in this task.

### Audit Events

The delivery loop writes redacted audit events for:

```text
webhook.delivery_requested
webhook.delivery_attempted
webhook.delivered
webhook.failed
webhook.dead
webhook.replayed
```

Audit payloads include safe operational metadata only:

- event id;
- event type;
- attempt count;
- HTTP status;
- retry timestamp;
- sanitized error.

They do not include raw phone numbers or raw notification text.

## Files Changed

Core implementation:

```text
apps/job-worker/src/webhooks.ts
apps/job-worker/src/webhook-runtime.ts
apps/job-worker/src/index.ts
apps/job-worker/package.json
```

Tests:

```text
apps/job-worker/src/webhooks.test.ts
apps/job-worker/src/webhook-runtime.test.ts
```

Database:

```text
packages/database/migrations/001_initial_schema.sql
packages/database/migrations/002_webhook_delivery_loop.sql
packages/database/src/index.ts
```

Shared contracts/events:

```text
packages/contracts/src/index.ts
packages/events/src/index.ts
```

API/admin alignment:

```text
apps/api/src/admin.ts
```

Configuration:

```text
.env.example
package-lock.json
```

Documentation:

```text
docs/WEBHOOK_DELIVERY_LOOP.md
docs/05_DATABASE_SCHEMA.md
docs/07_EVENT_CATALOG.md
docs/12_WEBHOOKS.md
docs/IMPLEMENTATION_NOTES.md
docs/LOCAL_DEVELOPMENT.md
```

Agent reports:

```text
.swimpay-agent/CURRENT_TASK.md
.swimpay-agent/TASK_QUEUE.md
.swimpay-agent/PROGRESS_LOG.md
.swimpay-agent/NEXT_ACTION.md
.swimpay-agent/PHASE_2_RUNTIME_PLAN.md
```

## Tests Added

Added meaningful tests for:

- explicit durable status constants;
- retry schedule;
- delivery headers including `SwimPay-Delivery-Id`;
- duplicate endpoint/event prevention;
- due delivery claiming;
- second claim not receiving the same delivery;
- successful HTTP response marking delivery as delivered;
- failed HTTP response scheduling retry;
- network error sanitization;
- exhausted attempts marking delivery as dead;
- raw PII field marker rejection;
- replay preserving event id and creating a new delivery id;
- `webhook.delivery_requested` handler by delivery id;
- `webhook.delivery_requested` handler by event id;
- invalid NATS event data rejection;
- polling loop processing due rows only when enabled.

## TDD Evidence

Targeted tests were written before implementation and initially failed.

Initial targeted red run:

```text
npm test -- apps/job-worker/src/webhooks.test.ts apps/job-worker/src/webhook-runtime.test.ts
```

Expected failures included:

- missing durable statuses;
- missing `SwimPay-Delivery-Id`;
- missing claim API;
- missing runtime module;
- old retry status behavior;
- raw PII not rejected.

After implementation, targeted tests passed:

```text
apps/job-worker/src/webhooks.test.ts        PASS
apps/job-worker/src/webhook-runtime.test.ts PASS
```

## Validation Results

Final validation passed:

```text
npm run typecheck                                           PASS
npm run lint                                                PASS
npm test                                                    PASS
npm run build                                               PASS
docker compose --env-file .env.example -f infra/docker-compose.yml config PASS
```

Test suite result:

```text
26 test files passed
144 tests passed
```

## Safety Review

Task 026 respected SwimPay guardrails:

- No PSP behavior added.
- No SBP behavior added.
- No SMS reading added.
- No bank app scraping added.
- No LLM payment decision logic added.
- No official bank confirmation behavior added.
- No payment auto-confirmation logic added.
- No signal parser runtime pipeline added.
- No matching runtime pipeline added.
- No Android Receiver logic added.
- No production deployment performed.
- No raw phone storage added.
- No raw notification text storage added.
- Webhook payload creation rejects raw PII field markers.

## Intentionally Not Implemented

The following remain intentionally out of scope:

- signal runtime pipeline;
- parser runtime integration;
- matching runtime integration;
- review runtime integration beyond already-created webhook events;
- Android Receiver logic;
- payment auto-confirmation;
- official bank confirmation behavior;
- production deployment;
- public/admin webhook replay endpoint exposure.

## Next Recommended Task

```text
027_signal_runtime_pipeline
```

This task should connect API, database, NATS, parser, matching, review creation and webhook delivery request generation into the durable signal runtime path while preserving the documented matching and privacy rules.

