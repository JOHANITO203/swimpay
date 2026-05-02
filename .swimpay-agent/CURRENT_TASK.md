# Current Task

task id: 024_operator_auth_and_admin_rbac
source task file: tasks/024_operator_auth_and_admin_rbac.md
status: completed
scope:
Replace the placeholder admin bearer convention with a production-oriented operator authentication and RBAC foundation for SwimPay admin endpoints.

files allowed:
- tasks/024_operator_auth_and_admin_rbac.md
- Phase 2 task files 025-031
- .swimpay-agent task queue and reports
- packages/security role/auth primitives
- apps/api admin auth integration and tests
- docs related to admin auth/RBAC and local development

forbidden work:
- Do not implement tasks 025-031.
- Do not deploy.
- Do not modify production secrets.
- Do not create real bank package/cert values.
- Do not claim official bank confirmation.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not modify unrelated product flows.

acceptance criteria:
- Missing admin auth is rejected.
- Dev admin auth works only when configured.
- Production mode rejects placeholder admin auth.
- read_only cannot perform dangerous actions.
- operator cannot promote bank templates without permission.
- Allowed admin action writes a redacted audit event.
- Admin responses do not expose raw PII.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T14:35:00+03:00
completed_at: 2026-05-02T14:47:23+03:00
result: completed

## Source requirements

See tasks/024_operator_auth_and_admin_rbac.md.
