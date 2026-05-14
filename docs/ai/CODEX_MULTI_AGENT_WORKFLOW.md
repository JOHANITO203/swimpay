# Codex Multi-Agent Workflow

Use this workflow only when a task is large enough to benefit from role
separation or the user asks for multi-agent work.

## Operating Rules

- The orchestrator owns scope, sequencing, conflict resolution and final
  closeout.
- Each agent gets a disjoint ownership area.
- Agents must not revert unrelated user or agent changes.
- Each agent writes one concise report per surface or responsibility in
  `.swimpay-agent`.
- Reports must state scope, findings, changed files, validation and blockers.
- SwimPay product truth overrides all external workflow rules.

## Roles

### Orchestrator

Owns the plan, work split, file ownership, integration review, validation and
final response. The orchestrator enforces forbidden-scope rules.

### Product Truth

Checks SwimPay identity, V1 manual-confirmation-only semantics, public event
truth and dangerous wording.

For design sprints, Product Truth blocks only:

- official bank confirmation claims;
- auto-confirmation or guarantee claims;
- raw notification exposure;
- raw secrets or sensitive data exposure;
- SBP/PSP/bank integration claims that contradict product truth.

It must not rewrite normal UI copy or derail visual implementation.

### Architecture

Checks repo boundaries, service ownership, task scope and whether a change
belongs in docs, Android, web, API or worker code.

### UI/Design

Owns visual grammar, tokens, typography, spacing, components, mockup matching,
responsive behavior and screenshot evidence.

### Android

Owns Android Compose surfaces, navigation, state rendering, accessibility
semantics and Android validation. Android never finalizes payments.

### Backend/API

Owns API contracts, workers and runtime behavior only when the sprint explicitly
allows backend/API changes. Backend/API is out of scope for design-only sprints.

### QA

Owns evidence collection, targeted validation, visual checks and regression
risk. QA verifies forbidden files were not changed in design-only mode.

### Security/Privacy

Checks secrets, PII, raw notifications, device identifiers, package visibility,
redaction and forbidden Android capabilities.

### Documentation

Owns AGENTS, docs, reports, blockers, next actions, progress log and task
queue updates.

## Design Sprint Defaults

For design sprints:

- Use Orchestrator, UI/Design, Android or Web, QA and Documentation roles.
- Product Truth is a guardrail role, not a copywriting role.
- Backend/API and Security/Privacy participate only to block forbidden scope or
  exposure.
- Reports live in `.swimpay-agent`.
- No overlapping write ownership.
