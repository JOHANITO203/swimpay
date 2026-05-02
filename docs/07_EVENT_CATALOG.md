# 07 — Event Catalog

NATS JetStream is used for durable internal events.

Events must be explicit, versionable and idempotent.

## Event envelope

```json
{
  "event_id": "evt_01",
  "event_type": "order.created",
  "version": 1,
  "occurred_at": "2026-05-01T21:00:00Z",
  "merchant_id": "mch_01",
  "idempotency_key": "order.created:ord_01",
  "data": {}
}
```

## Events

### `order.created`

Producer: `swimpay-api`

Consumers:

- payment session module;
- audit module.

Payload:

```json
{
  "order_id": "ord_01",
  "external_id": "order_888",
  "amount_minor": 13700,
  "currency": "RUB"
}
```

### `payment_session.created`

Producer: `swimpay-api`

Consumers:

- receiver arming logic;
- audit module.

### `payment_session.receiver_arming_requested`

Producer: payment session module.

Consumers:

- receiver device module;
- dashboard status.

### `payment_session.receiver_armed`

Producer: receiver device module.

Consumers:

- checkout status;
- audit module.

### `receiver.heartbeat_received`

Producer: `swimpay-api`.

Consumers:

- health monitor;
- dashboard;
- risk/trust module.

### `receiver.health_degraded`

Producer: health monitor.

Consumers:

- payment session module;
- dashboard;
- risk/trust module.

### `signal.received`

Producer: signal ingestion endpoint.

Consumers:

- signal parser;
- audit module.

### `signal.verified`

Producer: signal verification module.

Consumers:

- parser;
- risk module.

### `signal.parsed`

Producer: parser module.

Consumers:

- template learning;
- matching module.

### `signal.quality_scored`

Producer: signal quality module.

Consumers:

- matching module;
- dashboard;
- bank reliability module.

### `template.observed`

Producer: template learning module.

Consumers:

- drift radar;
- admin console.

### `template.drift_detected`

Producer: drift radar.

Consumers:

- risk module;
- dashboard;
- admin console.

### `match.candidates_found`

Producer: matching module.

Consumers:

- decision engine;
- audit module.

### `match.collision_detected`

Producer: matching module.

Consumers:

- decision engine;
- review module.

### `match.scored`

Producer: matching module.

Consumers:

- decision engine.

### `decision.auto_confirmed`

Producer: decision engine.

Consumers:

- order module;
- webhook worker;
- audit module;
- dashboard.

### `decision.needs_review`

Producer: decision engine.

Consumers:

- review module;
- webhook worker;
- dashboard.

### `decision.rejected`

Producer: decision engine.

Consumers:

- order module;
- webhook worker;
- audit module.

### `review.created`

Producer: review module.

Consumers:

- dashboard;
- webhook worker.

### `review.confirmed`

Producer: review module.

Consumers:

- order module;
- template learning;
- webhook worker;
- audit module.

### `review.rejected`

Producer: review module.

Consumers:

- order module;
- template learning;
- webhook worker;
- audit module.

### `webhook.delivery_requested`

Producer: decision/review/order module.

Consumers:

- webhook worker.

### `webhook.delivered`

Producer: webhook worker.

Consumers:

- dashboard;
- audit.

### `webhook.failed`

Producer: webhook worker.

Consumers:

- dashboard;
- retry scheduler;
- audit.

## Event rules

- Event names are constants.
- Payloads are typed.
- Consumers must be idempotent.
- Critical state changes must be persisted in PostgreSQL before event publication or use an outbox pattern.
