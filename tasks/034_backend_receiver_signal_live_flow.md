# 034 - Backend Receiver Signal Live Flow

## Goal

Add a synthetic backend receiver signal flow smoke foundation that proves accepted receiver uploads are stored and routed toward backend decision processing.

## Scope

- Use synthetic redacted data only.
- Exercise receiver signal upload through the backend endpoint or equivalent local harness.
- Verify signal storage and `signal.received` publication or runtime invocation.
- Verify `TO_VERIFY` bank metadata cannot auto-confirm.
- Verify accepted signal upload means backend processing pending, not payment confirmation.

## Guardrails

- No real bank data.
- No raw phone.
- No raw notification text.
- No payment confirmation on Android.
- No broad matching rule changes.

## Acceptance Criteria

- Synthetic receiver signal live-flow coverage exists.
- Signal upload remains privacy-safe.
- `TO_VERIFY` metadata routes away from auto-confirmation.
- Public responses do not claim payment confirmation.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
