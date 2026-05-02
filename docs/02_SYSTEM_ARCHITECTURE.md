# 02 — System Architecture

## Deployment model

V1 uses one Ubuntu server and Docker Compose.

The architecture is microservice-ready but compactly deployed.

## Runtime components

```text
Caddy/Nginx
PostgreSQL
Valkey
NATS JetStream
swimpay-api
swimpay-signal-worker
swimpay-job-worker
swimpay-web
Android Receiver App
```

## Logical architecture

```text
Buyer Checkout
  ↓
swimpay-api
  ↓
Payment Session Engine
  ↓
Android Receiver Armed Mode
  ↓
Bank Notification
  ↓
Android Receiver Capture
  ↓
Signed Signal Upload
  ↓
swimpay-signal-worker
  ↓
Parser + Template Learning
  ↓
Matching + Risk Core
  ↓
Decision Engine
  ↓
swimpay-job-worker
  ↓
Signed Webhook
```

## Source of truth

PostgreSQL is the source of truth for:

- orders;
- payment sessions;
- receiver devices;
- bank profiles;
- templates;
- notification signals;
- matches;
- reviews;
- webhooks;
- audit events.

Valkey must not be used as source of truth for payment decisions.

## Event bus

NATS JetStream is used for durable internal events.

NATS subjects are defined in `docs/07_EVENT_CATALOG.md`.

## Service responsibilities

### swimpay-api

Owns:

- merchants;
- API keys;
- orders;
- payment sessions;
- receiver device registration;
- dashboard API;
- checkout status.

### swimpay-signal-worker

Owns:

- signal ingestion;
- signature verification;
- anti-replay;
- parsing;
- bank template matching;
- signal quality scoring;
- order/session matching;
- risk scoring;
- decision engine.

### swimpay-job-worker

Owns:

- webhook delivery;
- webhook retry;
- order expiry;
- payment session expiry;
- cleanup;
- drift checks;
- template promotion/degradation.

### swimpay-web

Owns:

- hosted checkout;
- merchant dashboard;
- review UI;
- receiver/device UI;
- connected bank UI.

## Critical principle

Android captures, backend decides.

The Receiver App must never finalize a payment decision.

## Single-server constraints

The first deployment must avoid heavy infrastructure:

- no Kubernetes;
- no Kafka;
- no Elasticsearch/OpenSearch;
- no ClickHouse;
- no heavy analytics stack.

Monitoring should be minimal but useful:

- structured logs;
- health endpoints;
- Docker log rotation;
- PostgreSQL backups;
- basic metrics endpoint if possible.

## Future migration after V1 stable

After V1 stable, move to two servers:

```text
Server 1: app/web/workers/proxy
Server 2: PostgreSQL/Valkey/NATS/backups
```

Then split runtime services further only when required by traffic or operations.
