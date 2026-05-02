# Current Task

task id: 016_end_to_end_tests
source task file: tasks/016_end_to_end_tests.md
status: completed
scope:
Create end-to-end tests for the full payment signal flow.

files allowed:
- Files named or implied by tasks/016_end_to_end_tests.md
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
- E2E tests run automatically.
- Critical unsafe paths are covered.
- Tests use fake redacted data only.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T11:00:21.845Z
completed_at: 2026-05-02T11:05:00.000Z
result: completed

## Source requirements

See source task file.
