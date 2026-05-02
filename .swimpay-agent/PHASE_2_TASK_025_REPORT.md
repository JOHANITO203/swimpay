# Phase 2 Task 025 Report - NATS JetStream Consumers

generated_at: 2026-05-02T15:19:08+03:00

## Task

`025_nats_jetstream_consumers`

## Status

Completed.

Local commit:

```text
a7eb199 task 025: nats jetstream consumers
```

Branch:

```text
agent-autonomous-run
```

## Goal

Implement the first durable NATS JetStream consumer foundation for SwimPay runtime workers without implementing the full payment signal pipeline, webhook delivery loop, parser/matching/review runtime integration, Android receiver logic, or production deployment.

## Scope Implemented

### NATS Runtime Foundation

Implemented shared NATS/JetStream runtime support in `@swimpay/events`:

- NATS connection config parsing from environment.
- Graceful connection close support.
- Health metadata.
- Event publishing helper.
- Durable consumer subscription helper.
- Explicit ack/nack/term message processing.
- Safe event metadata logging.

Environment variables added or documented:

```text
NATS_URL=nats://nats:4222
NATS_STREAM_NAME=SWIMPAY_EVENTS
NATS_DURABLE_PREFIX=swimpay
NATS_CONNECT_TIMEOUT_MS=2000
```

### JetStream Stream

Defined the SwimPay internal event stream:

```text
SWIMPAY_EVENTS
```

Configured subjects:

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

### Event Envelope

Added the Phase 2 runtime internal event envelope:

```json
{
  "id": "evt_...",
  "type": "signal.received",
  "created_at": "2026-05-02T12:00:00Z",
  "source": "swimpay-api",
  "data": {},
  "metadata": {
    "correlation_id": "corr_...",
    "causation_id": "evt_parent"
  }
}
```

Validation requires:

- `id`
- `type`
- `created_at`
- `source`
- `data`

The validator rejects raw PII field markers such as raw notification text or raw phone fields.

### Event Catalog Update

Added:

```text
payment_session.expired
```

This is used by the job worker expiry consumer foundation.

## Worker Integration

### Signal Worker

The signal worker now registers durable consumer skeletons for:

```text
signal.received
signal.verified
signal.parsed
match.scored
```

Current behavior:

- Connects to NATS if available.
- Ensures the stream exists.
- Registers durable consumers.
- Validates known event envelopes.
- Acknowledges successfully handled events.
- Exposes NATS/consumer state in health output.

### Job Worker

The job worker now registers durable consumer skeletons for:

```text
webhook.delivery_requested
order.expired
payment_session.expired
```

Current behavior:

- Connects to NATS if available.
- Ensures the stream exists.
- Registers durable consumers.
- Validates known event envelopes.
- Acknowledges successfully handled events.
- Exposes NATS/consumer state in health output.

## Ack/Nack/Term Behavior

The shared handler wrapper now:

- Calls `ack()` when a valid expected event is handled successfully.
- Calls `nak()` and rethrows when the handler fails.
- Calls `term()` and throws when the event payload is invalid.
- Calls `term()` and throws when the event type does not match the expected consumer type.

Errors are not silently swallowed inside the tested wrapper.

## Tests Added

Added tests for:

- Event envelope validation.
- Rejection of raw PII field markers in event data.
- NATS config parsing.
- Stream configuration.
- Durable consumer definition creation.
- Unknown event type rejection.
- Explicit ack consumer option summary.
- Ack on successful handler execution.
- Nack on handler error.
- Term on invalid or unexpected events.
- Signal worker expected consumer registrations.
- Job worker expected consumer registrations.
- Consumer event names existing in the event catalog.

New test files:

```text
packages/events/src/jetstream.test.ts
apps/signal-worker/src/consumers.test.ts
apps/job-worker/src/consumers.test.ts
```

## Documentation Updated

Created:

```text
docs/NATS_JETSTREAM_CONSUMERS.md
```

Updated:

```text
docs/07_EVENT_CATALOG.md
docs/IMPLEMENTATION_NOTES.md
docs/LOCAL_DEVELOPMENT.md
.swimpay-agent/CURRENT_TASK.md
.swimpay-agent/TASK_QUEUE.md
.swimpay-agent/PROGRESS_LOG.md
.swimpay-agent/NEXT_ACTION.md
.swimpay-agent/PHASE_2_RUNTIME_PLAN.md
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
25 test files passed
136 tests passed
```

## Safety Review

Task 025 respected SwimPay guardrails:

- No PSP behavior added.
- No SBP behavior added.
- No SMS reading added.
- No bank app scraping added.
- No LLM payment decision logic added.
- No official bank confirmation wording added.
- No raw phone storage added.
- No raw notification text storage added.
- No payment auto-confirmation logic added.
- No webhook delivery loop implemented.
- No parser/matching/review runtime pipeline implemented.
- No production deployment performed.

## Intentionally Not Implemented

The following remain intentionally out of scope:

- Postgres-backed webhook delivery loop.
- Durable webhook retry/replay worker path.
- Live signal parser runtime pipeline.
- Live matching/review runtime pipeline.
- Android Receiver contract validation.
- Production deployment.
- Any payment confirmation behavior inside workers.

## Next Recommended Task

```text
026_postgres_webhook_delivery_loop
```

This task should connect the existing webhook delivery foundation to durable Postgres-backed scheduling, retries and replay behavior while preserving signing and idempotency guarantees.

