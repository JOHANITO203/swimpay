# ADR 0001 — Use Single Server First

## Status

Accepted

## Context

SwimPay starts with one Ubuntu server with 2 GB RAM and 50 GB storage.

The project needs to build a V1 quickly without paying for multiple servers too early.

## Decision

V1 runs on one server using Docker Compose.

Runtime services are compact:

- proxy;
- PostgreSQL;
- Valkey;
- NATS JetStream;
- swimpay-api;
- swimpay-signal-worker;
- swimpay-job-worker;
- swimpay-web.

## Consequences

- Lower cost.
- Faster MVP.
- Single point of failure accepted for beta.
- Architecture must remain ready for later split.
- After V1 stable, move to second server.
