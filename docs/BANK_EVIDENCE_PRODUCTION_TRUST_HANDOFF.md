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

## Audit Continuity

Required events:

- `bank_evidence.production_trust_requested`
- `bank_evidence.production_trust_approved`
- `bank_evidence.production_trust_revoked`

Audit payloads must contain masked certificate hashes only and must not contain raw notification text, raw phone numbers, secrets, API keys or private keys.
