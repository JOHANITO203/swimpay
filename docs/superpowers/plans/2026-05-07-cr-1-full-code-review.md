# CR-1 Full Code Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a full pre-real-world testing audit with no product behavior changes.

**Architecture:** The sprint is audit-only. It creates task files, performs repository-wide static and structural review, writes risk reports under `.swimpay-agent`, runs validation, and commits the audit artifacts.

**Tech Stack:** TypeScript, Fastify, Node SDK, Android/Kotlin Receiver, PostgreSQL migrations, Docker Compose, Vitest.

---

### Task 1: Create CR-1 Task Queue

**Files:**
- Create: `tasks/566_full_code_review_inventory.md` through `tasks/577_full_code_review_closeout.md`
- Modify: `.swimpay-agent/TASK_QUEUE.md`

- [ ] Create each task file with scope and deliverable.
- [ ] Update the active queue to tasks 566 through 577.
- [ ] Keep previous queue history below the active queue.

### Task 2: Gather Audit Evidence

**Files:**
- Read-only: `apps/**`, `packages/**`, `docs/**`, `examples/**`, `infra/**`, `scripts/**`, `tests/**`

- [ ] Run targeted `rg` searches for product-truth contradictions and security-sensitive terms.
- [ ] Map auth identity source per route.
- [ ] Map payment/review/webhook path from order creation to manual confirmation.
- [ ] Map Android Receiver permissions and exact package probing.
- [ ] Map migration and deployment gaps.

### Task 3: Write Audit Reports

**Files:**
- Create `.swimpay-agent/FULL_CODE_REVIEW_INVENTORY.md`
- Create `.swimpay-agent/PRODUCT_TRUTH_FULL_AUDIT.md`
- Create `.swimpay-agent/AUTH_BFF_TENANT_ISOLATION_AUDIT.md`
- Create `.swimpay-agent/PAYMENT_INTENT_REVIEW_FLOW_AUDIT.md`
- Create `.swimpay-agent/RECEIVER_INTELLIGENCE_CODE_AUDIT.md`
- Create `.swimpay-agent/WEBHOOK_SDK_CONTRACT_AUDIT.md`
- Create `.swimpay-agent/ANDROID_RECEIVER_UI_AUDIT.md`
- Create `.swimpay-agent/DATABASE_MIGRATIONS_DATA_INTEGRITY_AUDIT.md`
- Create `.swimpay-agent/SECURITY_PRIVACY_SECRET_HANDLING_AUDIT.md`
- Create `.swimpay-agent/VPS_DEPLOYMENT_READINESS_FULL_AUDIT.md`
- Create `.swimpay-agent/TEST_COVERAGE_QUALITY_GATES_AUDIT.md`
- Create `.swimpay-agent/FULL_CODE_REVIEW_REPORT.md`

- [ ] Rank findings as critical/high/medium/low.
- [ ] Distinguish real blockers from accepted future/follow-up limitations.
- [ ] Avoid claiming real OAuth/VPS/bank notification validation happened.

### Task 4: Validate

Run:

```powershell
npm run android:doctor
npm run typecheck
npm run lint
npm test
npm run build
docker compose --env-file .env.example -f infra/docker-compose.yml config
$env:COMPOSE_PARALLEL_LIMIT='1'; docker compose --env-file .env.example -f infra/docker-compose.yml build swimpay-api swimpay-web swimpay-signal-worker swimpay-job-worker proxy
docker compose --env-file .env.example -f infra/docker-compose.yml up -d --no-build
docker compose --env-file .env.example -f infra/docker-compose.yml ps
Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health
```

### Task 5: Closeout and Commit

**Files:**
- Modify: `.swimpay-agent/BLOCKERS.md`
- Modify: `.swimpay-agent/NEXT_ACTION.md`
- Modify: `.swimpay-agent/PROGRESS_LOG.md`

- [ ] Update closeout docs with audit result and next sprint.
- [ ] Commit as `sprint CR-1: full code review before real-world testing`.
