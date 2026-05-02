# Task 022 — Bank Template Drift Radar

## Codex instructions

Read before implementing:

- `AGENTS.md`
- `packages/bank-templates/AGENTS.md`
- `packages/bank-templates/README.md`
- `packages/bank-templates/BANK_TEMPLATE_SYSTEM.md`
- `packages/bank-templates/dsl/BANK_TEMPLATE_DSL.md`

Do not implement unrelated features.
Do not use LLMs.
Do not implement official bank confirmation.

## Goal

Implement drift detection based on template similarity and operational metrics.

## Requirements

- Detect new template candidates.
- Calculate similarity to existing templates.
- Track unknown rate.
- Track amount extraction success.
- Track phone/reference visibility.
- Output drift status: stable, minor_drift, major_drift, critical_drift.

## Acceptance criteria

- New template candidates do not become trusted automatically.
- Critical drift disables auto-confirm for affected bank.
- Drift events include reason codes.
