# 032 - Device Signature Verification Hardening

## Goal

Harden backend verification of Android Receiver signal signatures before live receiver work.

## Scope

- Define the supported receiver signature algorithm explicitly.
- Verify receiver signals using the registered receiver device public key.
- Reject missing or invalid signatures.
- Reject signatures from unknown, disabled, suspended or revoked devices.
- Ensure signed payloads include `event_id`, `device_id`, `notification_hash`, `local_counter` and `observed_at`.
- Preserve local counter replay protection.

## Guardrails

- Do not implement Android final payment confirmation.
- Do not implement PSP, SBP, SMS reading or bank-app scraping behavior.
- Do not introduce production secrets.
- Do not weaken matching or auto-confirmation gates.
- Do not store raw phone or raw notification text.

## Acceptance Criteria

- Supported receiver signature algorithm is typed and documented.
- Valid synthetic signatures are accepted.
- Missing signatures are rejected.
- Invalid signatures are rejected.
- Unknown or disabled devices are rejected.
- Local counter replay/regression is rejected.
- There is no production bypass.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
