# Current Task

task id: 023_bank_template_admin_console
source task file: tasks/023_bank_template_admin_console.md
status: completed
scope:
Expose minimal admin views/actions for bank templates.

files allowed:
- Files named or implied by tasks/023_bank_template_admin_console.md
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
- Admin cannot promote template to trusted if false_positive_count > 0.
- Admin cannot trust package/cert values equal to `TO_VERIFY`.
- Disable action immediately blocks auto-confirm candidate status.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T11:12:37.159Z
completed_at: 2026-05-02T11:28:00.000Z
result: completed

## Source requirements

- List bank profiles.
- List templates.
- Show status, reliability, seen count, human verified count, false positive count.
- Allow safe actions: promote, degrade, disable, mark false positive.
- Every admin action writes audit event.
