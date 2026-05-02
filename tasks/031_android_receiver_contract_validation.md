# 031 - Android Receiver Contract Validation

## Goal

Validate Android Receiver upload contracts and backend rejection behavior before deeper Android runtime work.

## Scope

- Strengthen request schema/contract tests.
- Verify signature, monotonic counter, package/cert and privacy fields.
- Do not implement Android final payment confirmation.
- Do not read SMS or scrape bank apps.

## Requirements

- Android captures, filters, redacts, signs and uploads.
- Backend decides.
- Raw notification text is not accepted or stored by default.
- TO_VERIFY package/cert metadata remains untrusted.

## Acceptance criteria

- Contract tests cover accepted and rejected receiver payloads.
- Anti-replay behavior is tested.
- Raw PII is rejected or redacted according to documented rules.
- Docs describe the receiver/backend boundary.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
