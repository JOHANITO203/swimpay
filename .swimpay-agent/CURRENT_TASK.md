# Current Task

task id: 027_signal_runtime_pipeline
source task file: tasks/027_signal_runtime_pipeline.md
status: completed
scope:
Wire `signal.received` to the deterministic parser, matching-core, review/reject/auto-confirm decisions, audit events and webhook delivery request foundation.

files allowed:
- tasks/027_signal_runtime_pipeline.md
- .swimpay-agent task queue and reports
- apps/signal-worker runtime, consumer wiring and tests
- packages/events event usage only if needed
- packages/matching-core usage only if needed
- packages/bank-templates parser usage only if needed
- docs related to signal runtime, matching, local development and implementation notes

forbidden work:
- Do not implement task 028 or later.
- Do not implement Android Receiver app logic.
- Do not implement SBP, PSP behavior, SMS reading or bank app scraping.
- Do not claim official bank confirmation.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not trust TO_VERIFY bank package names or certificates.
- Do not auto-confirm amount-only or negative direction signals.
- Do not deploy.
- Do not modify production secrets.

acceptance criteria:
- `signal.received` can process a stored notification signal.
- Redacted parser output feeds matching-core.
- TO_VERIFY and pending bank metadata route to review.
- Negative categories reject safely and never auto-confirm.
- Amount-only signals never auto-confirm.
- Strict synthetic trusted signal can auto-confirm in tests.
- Review and webhook delivery requests are idempotency-safe.
- Webhook payloads include notification-signal disclosure fields and no raw PII.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T16:00:00+03:00
completed_at: 2026-05-02T16:12:30+03:00
result: completed

## Source requirements

See tasks/027_signal_runtime_pipeline.md.
