# Current Task

task id: 028_review_rejection_semantics
source task file: tasks/028_review_rejection_semantics.md
status: completed
scope:
Clarify and implement safe review rejection semantics with explicit rejection scopes.

files allowed:
- tasks/028_review_rejection_semantics.md
- .swimpay-agent task queue and reports
- apps/api review repository/API/tests
- packages/events event constants
- packages/database review action migration/schema
- docs related to review queue, state machines, API, security and implementation notes

forbidden work:
- Do not implement task 029 or later.
- Do not implement Android Receiver app logic.
- Do not implement production deployment.
- Do not add real bank package/cert verification.
- Do not implement SBP or PSP behavior.
- Do not claim official bank confirmation.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not weaken auto-confirm gates.

acceptance criteria:
- Default reject scope is `signal`.
- Signal-scope rejection rejects review/signal only.
- Payment-session scope rejects the linked session without rejecting the order.
- Order scope explicitly rejects both order and linked session.
- Duplicate same-scope rejection is idempotent-safe.
- Conflicting scope escalation after resolution returns a clear error.
- Audit payloads are redacted.
- No signal-scope public `payment.rejected` webhook is created by default.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T16:22:00+03:00
completed_at: 2026-05-02T16:36:19+03:00
result: completed. Review rejection now defaults to signal scope, supports explicit payment_session and order scopes, is idempotent for same-scope repeats, rejects conflicting scope escalation, writes redacted audit events, and keeps signal-scope rejection internal without public payment.rejected webhook delivery.

## Source requirements

See tasks/028_review_rejection_semantics.md.
