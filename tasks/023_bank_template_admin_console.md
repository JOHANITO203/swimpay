# Task 023 — Bank Template Admin Console

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

Expose minimal admin views/actions for bank templates.

## Requirements

- List bank profiles.
- List templates.
- Show status, reliability, seen count, human verified count, false positive count.
- Allow safe actions: promote, degrade, disable, mark false positive.
- Every admin action writes audit event.

## Acceptance criteria

- Admin cannot promote template to trusted if false_positive_count > 0.
- Admin cannot trust package/cert values equal to `TO_VERIFY`.
- Disable action immediately blocks auto-confirm candidate status.
