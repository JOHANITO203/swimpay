# Current Task

task id: 021_bank_template_fixtures_tests
source task file: tasks/021_bank_template_fixtures_tests.md
status: completed
scope:
Create automated tests for all bank template fixtures.

files allowed:
- Files named or implied by tasks/021_bank_template_fixtures_tests.md
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
- All global fixtures pass.
- All adversarial fixtures pass.
- All bank-specific fixtures pass.
- Amount-only signals are never auto-confirm candidates.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T10:25:57.915Z
completed_at: 2026-05-02T13:35:41.4011351+03:00
result: completed

## Source requirements

- Load JSONL fixtures.
- Parse each fixture.
- Compare expected direction label.
- Compare expected auto-confirm candidate boolean.
- Fail if any negative fixture becomes auto-confirm candidate.
