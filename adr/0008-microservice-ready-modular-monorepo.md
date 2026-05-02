# ADR 0008 — Microservice-ready Modular Monorepo

## Status

Accepted

## Context

The project prefers microservice architecture, but the first server is resource-limited.

## Decision

Use a modular monorepo and deploy compact services first.

Initial deployables:

- swimpay-api;
- swimpay-signal-worker;
- swimpay-job-worker;
- swimpay-web;
- android-receiver.

## Consequences

Code boundaries are clean.
Runtime complexity stays low.
Services can be split after V1 stable.
