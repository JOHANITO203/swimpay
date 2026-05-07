# Sprint 9K Production-Mode Staging Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate and harden SwimPay production-mode staging boundaries without public production deployment or real bank notification capture.

**Architecture:** Keep Sprint 9J Auth BFF as the foundation. Add focused production-mode tests and safe staging tooling rather than changing payment runtime behavior. Use synthetic data only and preserve identity separation between BFF sessions, SDK API keys and Receiver devices.

**Tech Stack:** TypeScript, Fastify, Vitest, PostgreSQL migrations, Docker Compose, PowerShell/Node local validation.

---

### Task 1: Queue and Inventory

**Files:**
- Create: `tasks/546_prod_mode_staging_inventory.md` through `tasks/555_prod_mode_staging_closeout.md`
- Modify: `.swimpay-agent/TASK_QUEUE.md`
- Create: `.swimpay-agent/PROD_MODE_STAGING_INVENTORY.md`

- [ ] Create Sprint 9K task files and queue.
- [ ] Audit production env controls, auth routes, BFF sessions, API key verification, receiver routes and Docker Compose assumptions.
- [ ] Write inventory report.

### Task 2: Production Guardrail Tests

**Files:**
- Test: `apps/api/src/prod-mode-staging.test.ts`
- Modify: `apps/api/src/orders.ts`
- Modify: `apps/api/src/server.ts`

- [ ] Add tests for production BFF session + CSRF, dev bootstrap rejection, `Bearer test_*` rejection, stored API key order creation, `auto_confirm` rejection and production receiver registration via BFF session.
- [ ] Run targeted test and confirm expected failures before implementation.
- [ ] Implement minimal route and validation changes.
- [ ] Re-run targeted test.

### Task 3: Env Contract and Staging Seed Tool

**Files:**
- Create: `docs/PRODUCTION_ENVIRONMENT.md`
- Modify: `.env.example`
- Create: `scripts/seed-staging-auth-bff.mjs`
- Test: `tests/prod-mode-staging-guardrails.test.ts`

- [ ] Add safe placeholder env names only.
- [ ] Add guarded synthetic staging seed script for user, merchant, membership, BFF session and hashed API key.
- [ ] Add static tests proving no real secrets are committed and the seed script is guarded.

### Task 4: VPS Staging Readiness and Closeout

**Files:**
- Create: `.swimpay-agent/VPS_STAGING_READINESS_AUDIT.md`
- Create: `.swimpay-agent/PROD_MODE_STAGING_VALIDATION_REPORT.md`
- Modify: `.swimpay-agent/BLOCKERS.md`
- Modify: `.swimpay-agent/NEXT_ACTION.md`
- Modify: `.swimpay-agent/PROGRESS_LOG.md`

- [ ] Document VPS staging readiness for 2-4 GB constraints, Compose memory/log/health/migration assumptions and blockers.
- [ ] Run full validation commands.
- [ ] Commit if validation passes.
