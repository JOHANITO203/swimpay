# Webhook Delivery Loop

Task: `026_postgres_webhook_delivery_loop`

## Purpose

The webhook delivery loop delivers signed public webhook events through a durable PostgreSQL-backed worker path. NATS JetStream triggers processing, but PostgreSQL is the source of truth for delivery state, idempotency, retries and terminal failures.

This task does not implement signal parser runtime wiring, matching runtime wiring, Android Receiver logic, payment auto-confirmation, or production deployment.

## Delivery Statuses

```text
pending
delivering
delivered
failed
dead
cancelled
```

- `pending`: ready for first attempt.
- `delivering`: claimed by one worker.
- `delivered`: terminal successful 2xx response.
- `failed`: retryable failure with `next_retry_at`.
- `dead`: terminal failure after attempts are exhausted.
- `cancelled`: terminal state for inactive/cancelled endpoint handling.

## PostgreSQL Claiming

The Postgres repository claims rows with a transactional `FOR UPDATE SKIP LOCKED` flow:

```text
pending/failed due rows -> delivering -> attempt -> delivered/failed/dead/cancelled
```

Claimable rows must satisfy:

- status is `pending` or `failed`;
- `next_retry_at` is null or due;
- `attempt_count < max_attempts`.

Valkey is not used as the delivery lock or source of truth.

## NATS Relationship

The job worker consumes:

```text
webhook.delivery_requested
```

The event data may include:

```json
{
  "delivery_id": "del_01",
  "event_id": "evt_public_01"
}
```

If `delivery_id` is present, the worker claims and processes that delivery. If only `event_id` is present, it claims all due deliveries for that event. The NATS message is acknowledged only after the handler path returns successfully through the shared JetStream consumer wrapper.

## Fallback Polling

The job worker can also run a fallback polling loop so pending webhooks are processed even if an event is missed or the worker restarts.

Environment:

```text
WEBHOOK_WORKER_ENABLED=false
WEBHOOK_POLL_INTERVAL_MS=30000
WEBHOOK_WORKER_BATCH_SIZE=10
WEBHOOK_MAX_ATTEMPTS=7
WEBHOOK_REQUEST_TIMEOUT_MS=5000
WEBHOOK_RETRY_BASE_DELAY_MS=60000
WEBHOOK_RETRY_MAX_DELAY_MS=86400000
```

Polling is disabled by default for tests and local light startup unless explicitly enabled.

## HTTP Delivery

The worker sends a POST request to the endpoint URL with stable JSON payload bytes and these headers:

```text
Content-Type: application/json
SwimPay-Event-Id: evt_01
SwimPay-Delivery-Id: del_01
SwimPay-Timestamp: 2026-05-02T10:00:00.000Z
SwimPay-Signature: sha256=...
```

The signature remains HMAC-SHA256 over:

```text
<timestamp>.<raw_payload>
```

HTTP redirects are not automatically followed by the worker client. A request timeout is required.

## Retry Schedule

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
- 4xx/5xx/timeout/network error with attempts remaining: `failed` with `next_retry_at`.
- attempts exhausted: `dead`.
- inactive endpoint: `cancelled`.

There are no infinite retries.

## Idempotency

The canonical active delivery uniqueness rule is endpoint/event pair:

```text
endpoint_id + event_id
```

Replay creates a new delivery id while keeping the original public event id. Receiver systems must use `SwimPay-Event-Id` as their idempotency key.

## Audit Events

The delivery loop writes redacted audit events for:

```text
webhook.delivery_requested
webhook.delivery_attempted
webhook.delivered
webhook.failed
webhook.dead
webhook.replayed
```

Audit payloads include safe metadata such as event id, event type, attempt count, HTTP status and retry time. They must not include raw phone numbers or raw notification text.

## Intentional Non-Implementation

Task 026 intentionally does not implement:

- signal parser runtime pipeline;
- matching runtime pipeline;
- review runtime integration beyond webhook events already created;
- Android Receiver logic;
- payment auto-confirmation;
- production deployment;
- public admin replay endpoint changes.

