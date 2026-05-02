# Current Task

task id: 020_bank_template_parser_core
source task file: tasks/020_bank_template_parser_core.md
status: completed
scope:
Implement deterministic parser logic using shared lexicons, patterns and templates.

files allowed:
- Files named or implied by tasks/020_bank_template_parser_core.md
- Tests for this task
- Documentation directly related to this task
- Shared packages only when required by this task

forbidden work:
- Do not implement any later task.
- Do not deploy.
- Do not modify production secrets.
- Do not create real bank package/cert values.
- Do not claim official bank confirmation.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not modify unrelated services.

acceptance criteria:
- Cashback classified as `incoming_cashback`.
- Refund classified as `incoming_refund`.
- Outgoing classified as `outgoing_payment` or `outgoing_transfer`.
- Failed classified as `failed_transfer`.
- Promo classified as `promo`.
- Incoming transfer classified only when negative gates do not block.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T10:19:09.330Z
completed_at: 2026-05-02T10:39:00.000Z
result: completed

## Source requirements

- Normalize RU text.
- Extract amount/currency.
- Extract phone if visible.
- Extract reference if visible.
- Detect masked phone as weak signal only.
- Classify direction labels.
- Apply negative gates before incoming customer transfer.
- Emit reason codes.
