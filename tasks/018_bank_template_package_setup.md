# Task 018 — Bank Template Package Setup

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

Integrate `packages/bank-templates` into the repo build system.

## Requirements

- Add package metadata if the repo uses workspaces.
- Ensure TypeScript stubs compile if TypeScript is used.
- Ensure YAML and JSONL assets are not ignored.
- Add a basic test that verifies the package files exist.

## Acceptance criteria

- Package is discoverable by the repo.
- `packages/bank-templates/src/types.ts` compiles.
- No payment decision logic is implemented here.
