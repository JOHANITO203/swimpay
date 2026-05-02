# Contributing to SwimPay

## Workflow

1. Choose one task from `tasks/`.
2. Read `AGENTS.md` and all docs referenced by the task.
3. Implement only the task scope.
4. Add or update tests.
5. Run lint, typecheck, tests and build.
6. Update docs if behavior changes.
7. Summarize changes and remaining risks.

## Coding standards

- Use explicit types.
- Use enums/constants for statuses, decisions and event names.
- Keep payment decision logic in shared core modules, not controllers.
- Do not duplicate parser/matching logic.
- Emit reason codes for every automatic decision.
- Create audit events for every state transition.

## Database changes

Any database change must update:

- migration file;
- `docs/05_DATABASE_SCHEMA.md`;
- tests that cover constraints;
- affected API/event docs.

Critical constraints must be protected by PostgreSQL, especially:

- unique signal event IDs;
- unique notification hashes;
- no double-confirmed order;
- no double-used signal.

## Security changes

Any security or privacy change must update:

- `docs/11_SECURITY_AND_PRIVACY.md`;
- `SECURITY.md`;
- relevant tests.

## Naming

Use these terms consistently:

- `order` — commercial purchase intent;
- `payment_session` — active operational payment window;
- `payment_signal` — parsed signal from merchant-side notification;
- `signal_match` — relation between signal and order/session;
- `decision` — auto-confirm/review/reject;
- `review` — human merchant decision.

Do not use terms that imply official bank confirmation.
