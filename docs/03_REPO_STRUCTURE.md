# 03 — Repo Structure

## Target repository layout

```text
swimpay/
│
├── README.md
├── AGENTS.md
├── CODEX_START_HERE.md
├── CONTRIBUTING.md
├── SECURITY.md
│
├── apps/
│   ├── api/
│   ├── signal-worker/
│   ├── job-worker/
│   ├── web/
│   └── android-receiver/
│
├── packages/
│   ├── database/
│   ├── events/
│   ├── contracts/
│   ├── security/
│   ├── matching-core/
│   ├── bank-templates/
│   ├── risk-core/
│   └── shared-utils/
│
├── infra/
│   ├── docker-compose.yml
│   ├── caddy/
│   ├── postgres/
│   ├── valkey/
│   └── nats/
│
├── docs/
├── tasks/
└── adr/
```

## Rules

- Controllers must not contain business logic.
- Matching logic belongs in `packages/matching-core`.
- Risk and trust scoring belongs in `packages/risk-core`.
- Bank parsing/template logic belongs in `packages/bank-templates`.
- Event names and payload contracts belong in `packages/events`.
- API DTOs and public contracts belong in `packages/contracts`.
- Database schema and migrations belong in `packages/database`.
- Shared crypto/HMAC/signature helpers belong in `packages/security`.

## Deployable apps

### `apps/api`

Public API, dashboard API and payment session orchestration.

### `apps/signal-worker`

Signal verification, parser, matching and decision engine.

### `apps/job-worker`

Webhooks, retries, cleanup and scheduled jobs.

### `apps/web`

Hosted checkout and merchant dashboard.

### `apps/android-receiver`

Android Kotlin Receiver App.

## Avoid

Do not create random service folders outside the planned structure.
Do not duplicate constants across apps.
Do not put payment matching in frontend or Android code.
