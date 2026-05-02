# Admin Auth And RBAC

SwimPay admin endpoints are operator-only. They are not merchant APIs and must not be exposed publicly without production-grade authentication, network policy, and operator account controls.

## Roles

Operator roles are defined centrally in `@swimpay/security`:

- `owner`
- `admin`
- `operator`
- `support`
- `read_only`

## Permissions

Permissions are also centralized in `@swimpay/security`:

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

`owner` and `admin` have all permissions. `operator` can view operational data and degrade/review templates, but cannot promote or disable templates. `support` and `read_only` have read-focused access only.

## Authentication Modes

### Development token mode

Local development can use:

```text
ADMIN_AUTH_MODE=dev_token
DEV_ADMIN_TOKEN=<local random token>
DEV_ADMIN_OPERATOR_ID=dev_operator
DEV_ADMIN_ROLE=admin
```

Requests use:

```text
Authorization: Bearer <local random token>
```

The token must be configured. If `DEV_ADMIN_TOKEN` is missing, admin endpoints reject requests.

### Signed token mode

Future production should use signed operator tokens:

```text
ADMIN_AUTH_MODE=signed_token
ADMIN_TOKEN_HMAC_SECRET=<secret from deployment secret store>
```

The current foundation supports HMAC-signed tokens in the shape:

```text
op_<operator_id>.<role>.<signature>
```

The signature is HMAC-SHA256 over:

```text
<operator_id>.<role>
```

This is a production-oriented foundation, not a full identity system. A future task should replace manual signed tokens with a real operator identity provider, session lifecycle, rotation and account management.

## Production Safety

Production rejects:

- missing auth;
- placeholder `Bearer admin_<operator_id>` tokens;
- development-token mode;
- signed-token mode without `ADMIN_TOKEN_HMAC_SECRET`;
- invalid signatures;
- unknown roles.

Do not hardcode production secrets in the repository.

## Admin Endpoint Permissions

Current admin endpoint gates:

- bank profile/template/drift reads: `view_bank_templates`
- webhook failure reads: `view_webhooks`
- receiver health reads: `view_admin_dashboard`
- audit search: `view_audit_logs`
- template promote: `promote_bank_templates`
- template degrade/review-only: `degrade_bank_templates`
- template disable/false-positive: `disable_bank_templates`

Dangerous actions continue to write redacted audit events.

## Privacy

Admin responses must not expose raw phone numbers or raw notification text. Use masked phone values, redacted canonical templates, and redacted audit payloads only.
