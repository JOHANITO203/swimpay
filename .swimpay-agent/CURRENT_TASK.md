# Current Task

task id: 029_durable_worker_e2e_tests
source task file: tasks/029_durable_worker_e2e_tests.md
status: completed
scope:
Add durable in-process end-to-end tests across API, signal runtime, review semantics, webhook delivery and worker boundaries.

files allowed:
- tasks/029_durable_worker_e2e_tests.md
- .swimpay-agent task queue and reports
- tests durable E2E files
- existing app/package test harness files if needed
- docs related to durable worker E2E tests, local development and implementation notes

forbidden work:
- Do not implement task 030 or later.
- Do not implement Android Receiver app logic.
- Do not implement production deployment.
- Do not add real bank package/cert verification.
- Do not implement SBP or PSP behavior.
- Do not claim official bank confirmation.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not weaken auto-confirm gates.
- Do not add unrelated parser, matching, review, webhook or UI features.

acceptance criteria:
- In-process E2E tests cover API order/session creation and receiver signal ingestion.
- Tests cover untrusted bank app routing to review.
- Tests cover amount-only and unsafe categories never auto-confirm.
- Tests cover trusted synthetic auto-confirm and webhook delivery record creation.
- Tests cover collision review and duplicate signal idempotency.
- Tests cover review rejection semantics through API.
- Tests cover webhook delivery success, retry/dead behavior and required signatures.
- Tests assert no raw phone, raw notification text, raw API keys or official-bank-confirmation claims in payloads.
- Worker boundary handlers are covered through current consumer abstractions.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T16:52:01+03:00
completed_at: 2026-05-02T16:57:53+03:00
result: completed. Added durable in-process E2E tests across API order/session creation, receiver signal ingestion, signal runtime, review rejection semantics, webhook delivery, retry/dead states and worker consumer boundaries. Full validation passed.

## Source requirements

See tasks/029_durable_worker_e2e_tests.md.
