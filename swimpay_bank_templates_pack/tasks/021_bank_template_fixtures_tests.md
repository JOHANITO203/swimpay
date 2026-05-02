# Task 021 — Bank Template Fixtures Tests

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

Create automated tests for all bank template fixtures.

## Requirements

- Load JSONL fixtures.
- Parse each fixture.
- Compare expected direction label.
- Compare expected auto-confirm candidate boolean.
- Fail if any negative fixture becomes auto-confirm candidate.

## Acceptance criteria

- All global fixtures pass.
- All adversarial fixtures pass.
- All bank-specific fixtures pass.
- Amount-only signals are never auto-confirm candidates.
