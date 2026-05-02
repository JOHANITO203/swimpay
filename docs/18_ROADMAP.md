# 18 — Roadmap

## Phase 0 — Server setup

- Ubuntu hardening;
- Docker Compose;
- PostgreSQL;
- Valkey;
- NATS JetStream;
- proxy HTTPS;
- backups;
- log rotation.

## Phase 1 — Core backend

- data model;
- orders;
- payment sessions;
- receiver devices;
- bank profiles;
- audit events.

## Phase 2 — Android Receiver Core

- NotificationListenerService;
- bank allowlist;
- snapshot extractor;
- coalescer;
- local parser;
- encrypted outbox;
- signed upload;
- heartbeat.

## Phase 3 — Signal ingestion

- receiver signal endpoint;
- signature verification;
- anti-replay;
- store signal;
- emit events.

## Phase 4 — Parser and bank profiles

- V1 bank profiles;
- positive/negative keyword rules;
- amount/phone/reference extraction;
- direction classifier;
- signal quality score.

## Phase 5 — Matching engine

- candidate search;
- exact amount/currency;
- phone/reference matching;
- collision detection;
- scoring;
- decision engine.

## Phase 6 — Review queue

- review model;
- reason codes;
- confirm/reject;
- feedback into templates.

## Phase 7 — Hosted checkout

- checkout summary;
- buyer identity;
- instructions;
- waiting confirmation;
- result screen;
- polling/live status.

## Phase 8 — Webhooks

- endpoint config;
- signed payloads;
- delivery worker;
- retries;
- replay;
- delivery logs.

## Phase 9 — Bank Template Learning

- canonical templates;
- reliability score;
- shadow mode;
- drift detection;
- mutation predictor;
- admin template view.

## Phase 10 — V1 hardening

- end-to-end tests;
- parser tests;
- matching tests;
- anti-replay tests;
- backup restore test;
- security review;
- pilot merchants.

## Phase 11 — Second server

After V1 stable:

- split app/data;
- improve reliability;
- increase worker capacity;
- add stronger monitoring.
