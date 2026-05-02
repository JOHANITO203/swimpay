# ADR 0003 — Use NATS JetStream

## Status

Accepted

## Context

SwimPay needs an event-driven architecture without heavy infrastructure like Kafka.

## Decision

Use NATS JetStream for internal durable event bus in V1.

## Consequences

- Lightweight enough for single server.
- Supports durable events and consumers.
- Fits microservice-ready architecture.
- Event consumers must be idempotent.
