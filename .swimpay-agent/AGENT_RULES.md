# SwimPay Agent Rules

These rules apply to local OpenClaw/Codex task execution.

The agent may:

- implement one task at a time
- modify files only inside the allowed task scope
- run tests, lint, typecheck and build
- update docs related to the task
- write progress reports

The agent must not:

- deploy to production
- delete migrations
- delete documentation
- modify secrets
- create real bank package/cert values
- claim official bank confirmation
- bypass tests
- implement payment auto-confirmation outside matching rules
- store raw phone numbers
- store raw notification text by default
- modify unrelated services
- continue if tests fail and the failure is not understood

SwimPay project guardrails:

- No LLM-based payment decisions.
- No SBP technical behavior. SBP wording is allowed only as user-facing copy for `phone_transfer`.
- No PSP behavior.
- No SMS reading.
- No bank app scraping.
- Android captures and signs signals. Backend decides.
- PostgreSQL is the source of truth.
- Valkey is only for cache, short locks, rate limits and temporary state.
- NATS JetStream is the internal event bus.
- Every payment-related state transition must be auditable.
