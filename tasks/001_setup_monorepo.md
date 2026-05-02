# Task 001 — Setup Monorepo

## Goal

Create the initial repository structure for SwimPay V1.

## Read first

- `AGENTS.md`
- `docs/02_SYSTEM_ARCHITECTURE.md`
- `docs/03_REPO_STRUCTURE.md`
- `docs/15_DEPLOYMENT_SINGLE_SERVER.md`

## Requirements

Create directories:

```text
apps/api
apps/signal-worker
apps/job-worker
apps/web
apps/android-receiver
packages/database
packages/events
packages/contracts
packages/security
packages/matching-core
packages/bank-templates
packages/risk-core
packages/shared-utils
infra
docs
tasks
adr
```

Add baseline package/workspace config appropriate to chosen stack.

Do not implement business logic yet.

## Acceptance criteria

- Repo structure matches `docs/03_REPO_STRUCTURE.md`.
- Apps/packages can be discovered by workspace tooling.
- Basic build/test placeholders exist.
- No payment logic implemented yet.
