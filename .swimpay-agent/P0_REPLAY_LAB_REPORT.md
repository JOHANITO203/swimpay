# P0 Replay Lab Report

generated_at: 2026-05-09T23:10:00+03:00

Status: partially implemented.

Added commands:

- `npm run test:replay`
- `npm run test:matching`
- `npm run test:privacy`
- `npm run test:webhooks`

The replay command runs deterministic parser, payment-intent gate, webhook and receiver privacy guardrail suites.

Remaining:

- A richer golden-output replay harness that emits a single audit artifact for parser -> matching -> review/webhook decisions.
- Fixture families for delayed notification, missing sender name, collision amount and same amount different route beyond the current unit suites.
