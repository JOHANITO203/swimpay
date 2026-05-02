# Task 020 — Bank Template Parser Core

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

Implement deterministic parser logic using shared lexicons, patterns and templates.

## Requirements

- Normalize RU text.
- Extract amount/currency.
- Extract phone if visible.
- Extract reference if visible.
- Detect masked phone as weak signal only.
- Classify direction labels.
- Apply negative gates before incoming customer transfer.
- Emit reason codes.

## Acceptance criteria

- Cashback classified as `incoming_cashback`.
- Refund classified as `incoming_refund`.
- Outgoing classified as `outgoing_payment` or `outgoing_transfer`.
- Failed classified as `failed_transfer`.
- Promo classified as `promo`.
- Incoming transfer classified only when negative gates do not block.
