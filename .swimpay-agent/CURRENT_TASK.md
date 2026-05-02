# Current Task

task id: 011_hosted_checkout
source task file: tasks/011_hosted_checkout.md
status: completed
scope:
Implement buyer checkout UI.

files allowed:
- Files named or implied by tasks/011_hosted_checkout.md
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
- UI does not claim official bank confirmation.
- Buyer phone explanation is shown.
- `J’ai payé` does not confirm payment.
- Status reflects backend order/session states.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T10:01:27.954Z
completed_at: 2026-05-02T10:12:00.000Z
result: completed

## Source requirements

Implement screens:

- Checkout Summary;
- Buyer Identity;
- Payment Instructions;
- Waiting Confirmation;
- Result.

Include:

- amount;
- timer;
- recipient;
- reference;
- copy buttons;
- open bank button placeholder;
- `J’ai payé` button;
- status polling.
