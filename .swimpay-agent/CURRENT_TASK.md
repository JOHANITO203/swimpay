# Current Task

task id: 022_bank_template_drift_radar
source task file: tasks/022_bank_template_drift_radar.md
status: completed
scope:
Implement drift detection based on template similarity and operational metrics.

files allowed:
- Files named or implied by tasks/022_bank_template_drift_radar.md
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
- New template candidates do not become trusted automatically.
- Critical drift disables auto-confirm for affected bank.
- Drift events include reason codes.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T10:36:53.519Z
completed_at: 2026-05-02T13:43:01.8692638+03:00
result: completed

## Source requirements

- Detect new template candidates.
- Calculate similarity to existing templates.
- Track unknown rate.
- Track amount extraction success.
- Track phone/reference visibility.
- Output drift status: stable, minor_drift, major_drift, critical_drift.
