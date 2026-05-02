# Current Task

task id: 012_webhook_worker
source task file: tasks/012_webhook_worker.md
status: completed
scope:
Implement signed webhook delivery with retries and replay.

files allowed:
- Files named or implied by tasks/012_webhook_worker.md
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
- Webhooks include required headers.
- Events include `official_bank_confirmation: false`.
- Retry works.
- Replay works.
- Duplicate endpoint/event delivery prevented.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T10:07:14.679Z
completed_at: 2026-05-02T10:18:00.000Z
result: completed

## Source requirements

Implement:

- webhook endpoints;
- event payload creation;
- HMAC signature;
- delivery worker;
- retry schedule;
- delivery logs;
- manual replay.
