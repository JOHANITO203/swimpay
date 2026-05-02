# Current Task

task id: 015_security_hardening
source task file: tasks/015_security_hardening.md
status: completed
scope:
Harden authentication, signatures, privacy and server-facing configuration.

files allowed:
- Files named or implied by tasks/015_security_hardening.md
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
- Sensitive values not logged.
- API keys are not stored raw.
- Webhook signatures verified in tests.
- Receiver signatures verified in tests.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T10:54:58.264Z
completed_at: 2026-05-02T13:58:16.8573056+03:00
result: completed

## Source requirements

Implement/check:

- API key hashing;
- webhook secret hashing;
- HMAC helpers;
- phone masking;
- redacted logs;
- anti-replay tests;
- no raw notification logs;
- private service networking.
