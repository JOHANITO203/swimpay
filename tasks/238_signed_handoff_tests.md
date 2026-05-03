# Task 238 - Signed Handoff Tests

Status: completed

## Scope

Add tests for signed operator tokens and signed-token handoff rehearsal.

## Result

Added:

- `tests/operator-token-helper.test.ts`
- `tests/evidence-production-trust-signed-local-rehearsal.test.ts`

Updated:

- `tests/agent-framework.test.ts`

## Coverage

- token signing and verification;
- masked token rendering;
- unsafe token helper input rejection;
- dual-control handoff;
- read-only RBAC denial;
- audit redaction and no auto-confirm side effects.
