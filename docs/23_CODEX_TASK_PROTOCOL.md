# 23 — Codex Task Protocol

## Goal

Codex must work task-by-task and avoid uncontrolled implementation.

## Before each task

Codex must read:

- `AGENTS.md`;
- the selected `tasks/*.md` file;
- related docs referenced by the task.

## During task

Codex must:

- implement only the requested scope;
- keep naming consistent;
- add tests;
- update docs if behavior changes;
- avoid unrelated refactors.

## After task

Codex must report:

- files changed;
- tests run;
- tests not run and why;
- important decisions;
- risks or follow-up tasks.

## Good Codex instruction

```text
Read AGENTS.md, docs/02_SYSTEM_ARCHITECTURE.md, docs/05_DATABASE_SCHEMA.md and tasks/002_create_database_schema.md.
Implement only task 002.
Run relevant tests and typecheck.
Do not implement API endpoints yet.
```

## Bad Codex instruction

```text
Build SwimPay.
```

## Forbidden Codex behavior

- Do not create payment decisions with LLMs.
- Do not implement SBP/PSP/bank API.
- Do not create raw notification logging by default.
- Do not skip tests for matching/security logic.
- Do not make Android decide payment confirmation.
