# Current Task

task id: 013_bank_template_learning
source task file: tasks/013_bank_template_learning.md
status: completed
scope:
Implement template canonicalization, stats, shadow mode and drift basics.

files allowed:
- Files named or implied by tasks/013_bank_template_learning.md
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
- Raw fake notification becomes redacted template.
- Seen count increments.
- False positive degrades template.
- New template starts in learning.
- No LLM used.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T10:44:36.890Z
completed_at: 2026-05-02T13:47:32.2684331+03:00
result: completed

## Source requirements

Implement:

- canonicalization;
- template hash;
- template stats updates;
- reliability score;
- lifecycle status;
- drift detection basic;
- mutation predictor basic.
