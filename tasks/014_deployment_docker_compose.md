# Task 014 — Deployment Docker Compose

## Goal

Create single-server Docker Compose deployment.

## Read first

- `docs/15_DEPLOYMENT_SINGLE_SERVER.md`
- `docs/02_SYSTEM_ARCHITECTURE.md`

## Requirements

Create compose services:

- proxy;
- postgres;
- valkey;
- nats;
- swimpay-api;
- swimpay-signal-worker;
- swimpay-job-worker;
- swimpay-web.

Ensure only proxy exposes public web ports.

## Acceptance criteria

- Compose starts locally.
- PostgreSQL/Valkey/NATS are not publicly exposed.
- Health checks exist where practical.
- Logs are configurable for rotation.
