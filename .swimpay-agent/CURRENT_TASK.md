# Current Task

task id: 018_bank_template_package_setup
source task file: tasks/018_bank_template_package_setup.md
status: completed
scope:
Integrate `packages/bank-templates` into the repo build system.

files allowed:
- Files named or implied by tasks/018_bank_template_package_setup.md
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
- Package is discoverable by the repo.
- `packages/bank-templates/src/types.ts` compiles.
- No payment decision logic is implemented here.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T10:11:53.391Z
completed_at: 2026-05-02T10:25:00.000Z
result: completed

## Source requirements

- Add package metadata if the repo uses workspaces.
- Ensure TypeScript stubs compile if TypeScript is used.
- Ensure YAML and JSONL assets are not ignored.
- Add a basic test that verifies the package files exist.
