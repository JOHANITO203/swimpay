# Bank Evidence Production Trust Handoff

Sprint 4W defines the operator handoff rehearsal for bank package/certificate metadata production trust.

SwimPay remains a Payment Signal Engine. Production trust is metadata-only. It does not create an official bank confirmation, does not process real bank notifications and does not enable auto-confirmation.

## Safety Boundary

The handoff drill must not:

- process real bank notifications;
- enumerate installed apps;
- read SMS;
- scrape bank apps;
- use customer data;
- expose raw phone numbers;
- expose raw notification text;
- enable auto-confirmation.

## Non-mutating Plan

Default usage is non-mutating:

```powershell
npm run handoff:evidence-trust -- --plan
npm run handoff:evidence-trust
```

The default run checks dashboard/audit API access only. It does not request, approve or revoke production trust.

## Mutating Local/Dev Drill

A full drill is allowed only against local/dev evidence and requires explicit operator input:

```powershell
$env:SWIMPAY_BASE_URL = "http://localhost:8080"
$env:SWIMPAY_EVIDENCE_ID = "<approved-review-only-evidence-id>"
$env:SWIMPAY_REQUESTER_TOKEN = "<requester-owner-or-admin-token>"
$env:SWIMPAY_APPROVER_TOKEN = "<different-approver-owner-or-admin-token>"
$env:SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF = "true"
npm run handoff:evidence-trust
```

Expected flow:

1. requester asks for production trust;
2. requester tries to approve and is blocked by dual-control;
3. second operator approves metadata trust;
4. second operator revokes after the drill;
5. audit trace includes request, approval and revocation events.

The response and audit data must keep:

```json
{
  "trusted": false,
  "auto_confirm_enabled": false
}
```

`production_trusted_app_metadata` may become true only during the explicit metadata trust portion of the drill. It must be revoked before the drill is closed.

## Local Token Note

The default Docker Compose configuration uses `ADMIN_AUTH_MODE=dev_token`, which represents one local dev operator. It is useful for dashboard and read-only rehearsal, but it cannot prove second-operator approval.

Full dual-operator rehearsal requires an environment configured with signed operator tokens or another explicit two-operator local/dev setup. Do not weaken RBAC to simulate a second operator.

Sprint 4X adds a local helper for signed operator tokens:

```powershell
npm run operator:tokens -- --masked
```

The helper is local/development only. It signs the same `op_<operator>.<role>.<signature>` token format verified by the API `signed_token` admin auth mode. It creates distinct requester, approver and revoker identities without changing role permissions.

For an unmasked local drill, set a local HMAC secret and capture tokens deliberately:

```powershell
$env:ADMIN_TOKEN_HMAC_SECRET = "local_signed_operator_token_secret_change_me"
npm run operator:tokens
```

Do not commit generated tokens. Do not use this helper for production operator lifecycle management.

## Signed Local Rehearsal

Sprint 4X adds a deterministic signed-token API rehearsal:

```powershell
npm run rehearsal:evidence:signed
```

This command runs an in-process local API with `ADMIN_AUTH_MODE=signed_token`, creates local review-only evidence, signs separate requester and approver tokens, then executes:

1. production trust request by requester;
2. same-actor approval attempt blocked by dual-control;
3. second-operator metadata trust approval;
4. revocation after the drill;
5. audit continuity inspection.

The rehearsal proves the signed-token path without weakening local Compose `dev_token` defaults and without leaving metadata trust approved.

## Audit Continuity

Required events:

- `bank_evidence.production_trust_requested`
- `bank_evidence.production_trust_approved`
- `bank_evidence.production_trust_revoked`

Audit payloads must contain masked certificate hashes only and must not contain raw notification text, raw phone numbers, secrets, API keys or private keys.
