# Task 019 — Bank Profile Registry

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

Implement a bank profile registry loader.

## Requirements

- Load V1 profiles from `packages/bank-templates/banks/*/profile.yml`.
- Validate required fields.
- Treat `TO_VERIFY` package/cert as untrusted.
- Expose bank profile status to backend logic.
- Do not auto-confirm if bank app is unverified.

## Acceptance criteria

- All 5 V1 banks load.
- Unknown bank profile returns review-only behavior.
- `TO_VERIFY` package/cert cannot pass trusted gate.
