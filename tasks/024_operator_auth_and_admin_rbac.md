# 024 - Operator Auth And Admin RBAC

## Goal

Replace the placeholder admin bearer convention with a production-oriented operator authentication and RBAC foundation for SwimPay admin endpoints.

## Scope

- Define centralized operator roles and permissions.
- Add safe dev-token auth for local development.
- Reject placeholder/default admin auth in production.
- Require permissions on admin read and dangerous action endpoints.
- Preserve redacted admin responses and audited dangerous actions.

## Requirements

- Roles: `owner`, `admin`, `operator`, `support`, `read_only`.
- Permissions:
  - `view_admin_dashboard`
  - `view_merchants`
  - `view_orders`
  - `view_signals`
  - `view_reviews`
  - `act_on_reviews`
  - `view_bank_templates`
  - `promote_bank_templates`
  - `degrade_bank_templates`
  - `disable_bank_templates`
  - `view_webhooks`
  - `replay_webhooks`
  - `view_audit_logs`
- Development mode may use a configured `DEV_ADMIN_TOKEN`.
- Production mode must reject missing auth, placeholder admin tokens, and default dev tokens.
- Do not hardcode production secrets.
- Admin endpoints must require an authenticated operator and the required permission.
- Dangerous actions must require explicit permissions and continue writing audit events.
- Admin responses must not expose raw phone numbers or raw notification text.

## Acceptance criteria

- Missing admin auth is rejected.
- Dev admin auth works only when configured.
- Production mode rejects placeholder/default dev auth.
- `read_only` can read allowed admin data but cannot perform dangerous actions.
- `operator` cannot promote bank templates without permission.
- Template actions write audit events when allowed.
- Admin responses remain redacted.
- Tests cover the auth/RBAC behavior.
- Documentation explains local usage and production restrictions.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
