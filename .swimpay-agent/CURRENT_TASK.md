# Current Task

task id: 019_bank_profile_registry
source task file: tasks/019_bank_profile_registry.md
status: completed
scope:
Implement a bank profile registry loader.

files allowed:
- Files named or implied by tasks/019_bank_profile_registry.md
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
- All 5 V1 banks load.
- Unknown bank profile returns review-only behavior.
- `TO_VERIFY` package/cert cannot pass trusted gate.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T10:14:56.477Z
completed_at: 2026-05-02T10:31:00.000Z
result: completed

## Source requirements

- Load V1 profiles from `packages/bank-templates/banks/*/profile.yml`.
- Validate required fields.
- Treat `TO_VERIFY` package/cert as untrusted.
- Expose bank profile status to backend logic.
- Do not auto-confirm if bank app is unverified.
