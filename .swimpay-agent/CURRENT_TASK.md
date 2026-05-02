# Current Task

task id: 017_admin_console_minimal
source task file: tasks/017_admin_console_minimal.md
status: completed
scope:
Implement minimal internal admin console for bank profiles, templates and incidents.

files allowed:
- Files named or implied by tasks/017_admin_console_minimal.md
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
- Operator can view bank statuses.
- Operator can view templates.
- Operator can mark template degraded/review_only.
- Actions create audit events.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T11:04:55.013Z
completed_at: 2026-05-02T11:18:00.000Z
result: completed

## Source requirements

Implement pages or API endpoints for:

- bank profiles;
- template registry;
- drift events;
- webhook failures;
- receiver health;
- audit search minimal.
