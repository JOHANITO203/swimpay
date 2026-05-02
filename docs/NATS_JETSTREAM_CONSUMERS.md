# NATS JetStream Consumers

Task: `025_nats_jetstream_consumers`

## Purpose

SwimPay uses NATS JetStream as its internal durable event bus. PostgreSQL remains the source of truth for payment state, idempotency and final decisions.

This foundation adds reusable connection, publish and durable consumer helpers. It does not implement the signal pipeline, parser/matching runtime, webhook delivery loop or Android receiver logic.

## Stream

The internal stream is:

```text
SWIMPAY_EVENTS
```

Default subjects:

```text
order.*
payment_session.*
receiver.*
signal.*
template.*
match.*
decision.*
review.*
webhook.*
```

The stream uses file storage and limit retention. The local NATS server remains private in Docker Compose.

## Event Envelope

Runtime events use the internal envelope:

```json
{
  "id": "evt_...",
  "type": "signal.received",
  "created_at": "2026-05-02T12:00:00.000Z",
  "source": "swimpay-api",
  "data": {},
  "metadata": {
    "correlation_id": "corr_...",
    "causation_id": "evt_parent"
  }
}
```

Required fields:

- `id`
- `type`
- `created_at`
- `source`
- `data`

`metadata` is optional but encouraged. Event data must not contain raw phone numbers or raw notification text.

## Consumers

Signal worker consumers:

- `signal.received`
- `signal.verified`
- `signal.parsed`
- `match.scored`

Job worker consumers:

- `webhook.delivery_requested`
- `order.expired`
- `payment_session.expired`

Durable names are generated from:

```text
<NATS_DURABLE_PREFIX>_<service_name>_<event_type>
```

Example:

```text
swimpay_swimpay_signal_worker_signal_received
```

## Ack And Error Behavior

The helper uses explicit ack behavior:

- successful handler result: `ack`
- handler error: `nak`, log safe metadata, rethrow
- malformed envelope: `term`, rethrow
- unexpected event type: `term`, rethrow

Errors are not silently hidden in the handler wrapper. Worker callback plumbing logs safe metadata only.

## Idempotency Guidance

Handlers must be written so PostgreSQL idempotency checks can be added before any state mutation.

For future tasks:

- payment decisions must be protected by PostgreSQL transactions and unique constraints;
- webhook delivery must be idempotent by endpoint/event pair;
- event handlers should use event `id` and domain object ids for idempotency records;
- Valkey must not be used as the source of truth for final decisions.

## Environment

Local variables:

```text
NATS_URL=nats://nats:4222
NATS_STREAM_NAME=SWIMPAY_EVENTS
NATS_DURABLE_PREFIX=swimpay
NATS_CONNECT_TIMEOUT_MS=2000
```

## Local Worker Commands

Run workers in development:

```bash
npm run dev:signal-worker
npm run dev:job-worker
```

Run targeted tests:

```bash
npm test -- packages/events/src/jetstream.test.ts
npm test -- apps/signal-worker/src/consumers.test.ts apps/job-worker/src/consumers.test.ts
```

## Intentional Non-Implementation

This task does not implement:

- parser runtime invocation;
- matching runtime invocation;
- review creation from live matching decisions;
- Postgres-backed webhook delivery loop;
- real payment confirmation behavior;
- Android receiver changes;
- production deployment.

Tasks `026` and `027` will build on this foundation.
