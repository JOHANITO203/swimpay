# Codex Skill Adaptation Report

generated_at: 2026-05-14T12:35:00+03:00

## Goal

Adapt useful external AI workflow material into SwimPay's Codex workflow without
copying Claude-specific mechanics or weakening product, privacy and runtime
guardrails.

## Adapted Rules

### Codex Workflow Integration

- Treat external workflow repos as references, not authority.
- Convert Claude command/agent/skill language into Codex orchestrator,
  delegated agents when explicitly useful, local docs and `.swimpay-agent`
  reports.
- Keep `AGENTS.md` strict and short; put operational detail in `docs/ai/*`.
- Use `.swimpay-agent/*` files as the durable coordination layer for audits,
  next actions, blockers and closeout.

### Design-Only Mode

- Allowed files: `AGENTS.md`, `docs/ai/*`, `.swimpay-agent/*`, and visual
  design docs/reports explicitly requested by the user.
- Forbidden changes: backend, payment runtime, API contracts, database
  migrations, webhook logic, receiver listener/runtime, SDK behavior,
  notification processing, auto-confirmation, SMS, Accessibility, scraping and
  `QUERY_ALL_PACKAGES`.
- Preserve existing UI copy unless the user asks for copy changes.
- During active polish, compile and inspect manual screenshots first.
  Roborazzi/golden recording is not a blocking gate until Visual Freeze Mode.

### Full Visual Rebuild Mode

- Triggered when the user says screens do not match mockups, asks for a full
  rebuild, or says the old theme is wrong.
- Treat the previous visual layer as suspect and rebuild the active UI layer
  from references.
- Remove mixed-theme residue instead of layering new colors on old structure.
- Preserve product truth and existing copy unless copy changes are explicitly
  requested.

### Multi-Agent Workflow

- Orchestrator owns scope, sequencing, conflict resolution and final closeout.
- Specialist agents may own product truth, architecture, UI/design, Android,
  backend/API, QA, security/privacy and documentation.
- No overlapping write ownership.
- One report per surface or role.
- Design sprint Product Truth review blocks only dangerous claims, raw
  notification exposure, raw secrets and product-truth violations.

### UI/UX Pro Max Adaptation

- Use dark premium fintech grammar where it matches SwimPay Android Merchant.
- Use mobile-first hierarchy, token-driven design, component reuse and spacing
  discipline.
- Use screenshot evidence after visual changes, but avoid fake runtime data and
  unregistered assets.
- Keep web-only or marketing-only recommendations out of Android Compose
  implementation guidance unless the sprint is hosted checkout/web.

## Rejected or Limited Material

- Claude marketplace/plugin install instructions: rejected as platform-specific.
- Claude hooks, sounds and settings: rejected as out of scope and potentially
  disruptive.
- Claude subagent frontmatter details: rejected; Codex has different agent
  mechanics.
- One-commit-per-file rule: rejected because it conflicts with local workflow
  and user did not request commits.
- Broad UI style catalogs: limited to practical SwimPay fintech/mobile rules.
- External safety or copy rules: limited by SwimPay product truth and current
  user task scope.

## Files To Update

- `AGENTS.md`
- `docs/ai/CODEX_DESIGN_WORKFLOW.md`
- `docs/ai/CODEX_MULTI_AGENT_WORKFLOW.md`
- `docs/ai/SWIMPAY_UI_UX_PRO_MAX_ADAPTATION.md`
- `.swimpay-agent/IMPORTED_SKILLS_AUDIT.md`
- `.swimpay-agent/CODEX_SKILL_INTEGRATION_CLOSEOUT.md`
- `.swimpay-agent/BLOCKERS.md`
- `.swimpay-agent/NEXT_ACTION.md`
- `.swimpay-agent/PROGRESS_LOG.md`
- `.swimpay-agent/TASK_QUEUE.md`

## Safety Result

The imported workflow is documentation-only. No runtime code, payment decision,
webhook, database, receiver, SDK or notification behavior is changed.
