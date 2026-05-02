# Current Task

task id: 010_review_queue
source task file: tasks/010_review_queue.md
status: completed
scope:
Implement review workflow for ambiguous payment signals.

files allowed:
- Files named or implied by tasks/010_review_queue.md
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
- Medium/ambiguous matches create review.
- Merchant can confirm/reject.
- Manual confirmation updates order/session.
- Manual rejection updates review.
- All actions audited.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T09:36:11.324Z
completed_at: 2026-05-02T10:05:00.000Z
result: completed

## Source requirements

Implement:

- review creation;
- review list endpoint;
- confirm endpoint;
- reject endpoint;
- review actions;
- audit events;
- template feedback hook.
