# Imported Skills Audit

generated_at: 2026-05-14T12:30:00+03:00

## Scope

This audit inspected external workflow material only. No payment runtime, backend,
API contract, database, webhook, receiver runtime, SDK or notification processing
logic was changed.

## Repositories Inspected

- `.external-skills/claude-code-best-practice`
- `.external-skills/ui-ux-pro-max-skill`

The cloned repositories are local research inputs and are ignored by git through
`.gitignore`.

## Useful Items

| Source item | Classification | SwimPay decision |
|---|---|---|
| `claude-code-best-practice/README.md` concepts overview | `needs_adaptation`, `coding_workflow` | Reuse only the idea of assembling workflows from roles, skills and reports. Reject Claude marketplace/install specifics. |
| `CLAUDE.md` context hygiene and project guidance | `needs_adaptation`, `duplicate_existing_rule` | Reuse short instruction-file discipline. SwimPay `AGENTS.md` remains authoritative. |
| `orchestration-workflow/orchestration-workflow.md` | `reusable_for_codex`, `multi_agent_workflow` | Adapt Command -> Agent -> Skill into Codex orchestrator -> scoped agents -> reports/docs. |
| `agent-teams/agent-teams-prompt.md` | `reusable_for_codex`, `multi_agent_workflow` | Reuse role separation and shared data contract discipline. Require disjoint ownership and `.swimpay-agent` reports. |
| `development-workflows/rpi/rpi-workflow.md` | `reusable_for_codex`, `coding_workflow` | Adapt Research -> Plan -> Implement gates into SwimPay task/report flow. Design-only tasks use Research -> Visual pass -> Evidence. |
| `development-workflows/cross-model-workflow/cross-model-workflow.md` | `claude_specific`, `needs_adaptation` | Keep the review handoff idea only. Do not require Claude/Codex cross-terminal workflow. |
| `best-practice/claude-subagents.md` | `claude_specific`, `multi_agent_workflow` | Rejected frontmatter details. Adapt only specialist role names and explicit tool/scope limits. |
| `best-practice/claude-skills.md` | `claude_specific`, `needs_adaptation` | Rejected Claude skill fields. Use Codex docs and `.swimpay-agent` reports instead of importing skill files. |
| Claude hooks/settings/commands examples | `claude_specific`, `unsafe_for_swimpay` | Do not import. They add platform behavior outside this sprint and can bypass repo-specific safety. |
| External git commit rule, one commit per file | `unsafe_for_swimpay` | Reject. It conflicts with local repo workflow and user did not request commits. |
| `ui-ux-pro-max-skill/README.md` design-system generator | `design_workflow`, `needs_adaptation` | Reuse design-system-first thinking, but do not persist external generated design-system folders. |
| `ui-ux-pro-max/SKILL.md` UI rules | `design_workflow`, `reusable_for_codex` | Reuse accessibility, touch target, spacing, token, dark mode, icon and visual consistency rules. |
| `src/ui-ux-pro-max/data/stacks/jetpack-compose.csv` | `design_workflow`, `needs_adaptation` | Reuse Compose-specific themes, semantics and content descriptions. |
| UI Pro Max web landing/chart rules | `duplicate_existing_rule`, `needs_adaptation` | Keep only when working on hosted checkout/web dashboard. Exclude irrelevant web-only material from Android Compose guidance. |
| UI Pro Max broad installation CLI and marketplace instructions | `claude_specific`, `unsafe_for_swimpay` | Do not import. SwimPay already has local Codex skills and repo guardrails. |
| UI Pro Max inspirational style catalog | `design_workflow`, `needs_adaptation` | Reuse only practical dark premium fintech grammar. Avoid generic motivational or unrelated style material. |

## Rules Rejected

- Any rule that lets external instructions override SwimPay product truth.
- Any workflow that broadens a design-only task into backend, API, database,
  webhook, receiver or SDK changes.
- Any auto-generated safety lecture that rewrites normal UI copy during visual
  polish.
- Any instruction that weakens root-cause fixes or encourages patch-only
  symptom neutralization.
- Any command, hook, marketplace install, or platform-specific Claude setup
  that would modify agent runtime outside this repository's explicit workflow.

## Extracted Design Rules

- Start from visual reference and existing SwimPay tokens before inventing new
  style.
- Keep Android Compose and hosted checkout mobile-first.
- Use token-driven color, radius, spacing, elevation and icon sizes.
- Maintain 44dp or larger touch targets and accessible labels.
- Preserve copy unless the user explicitly asks for copy work.
- Avoid mixed old and new themes during full visual rebuild.
- Use manual screenshots during active polish; record goldens only in visual
  freeze.

## Extracted Multi-Agent Rules

- One orchestrator owns scope, task order and final report.
- Each agent owns a disjoint surface or role.
- Agents report findings into `.swimpay-agent` instead of changing unrelated
  runtime files.
- Product Truth Agent blocks only dangerous claims, raw secret exposure and raw
  notification exposure during design sprints.
- QA Agent checks visual evidence, ownership overlap and forbidden runtime
  changes.
