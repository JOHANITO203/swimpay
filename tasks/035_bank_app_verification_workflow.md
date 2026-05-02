# 035 - Bank App Verification Workflow

## Goal

Define the operator workflow for verifying Android bank app package and signing certificate metadata without inventing real values.

## Scope

- Document collection of package name and SHA-256 certificate metadata from Android PackageManager output.
- Keep collected values untrusted until operator verification.
- Ensure unknown package/cert metadata remains untrusted.
- Add an admin/operator review path if the current admin foundation supports it safely.
- Test that `TO_VERIFY` cannot become trusted automatically.

## Guardrails

- Do not invent real package names.
- Do not invent real certificate fingerprints.
- Do not mark bank app metadata trusted automatically.
- Do not expose raw PII.
- Do not weaken admin RBAC.

## Acceptance Criteria

- Workflow documentation exists.
- Admin foundation can list and safely update bank app signature status if implemented.
- Trusted status requires explicit operator permission.
- `TO_VERIFY` and pending metadata remain untrusted without explicit verification.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
