# Task 381 — Frontend UI audit and component map

## Status
- [ ] Audit existing frontend in `apps/web`
- [ ] Identify monolithic components and HTML strings
- [ ] Map existing screens to the new required screens
- [ ] Define the component architecture (Atomic Design or similar)
- [ ] Create `.swimpay-agent/FRONTEND_UI_AUDIT.md`

## Context
The current frontend in `apps/web/src/index.ts` uses SSR with large string concatenations. It's difficult to maintain and doesn't follow the new visual grammar.

## Requirements
- Do not break existing business logic.
- Do not change existing APIs or event names.
- Identify what needs to be extracted into reusable components.
- Plan the migration from monolithic strings to a structured component system.
