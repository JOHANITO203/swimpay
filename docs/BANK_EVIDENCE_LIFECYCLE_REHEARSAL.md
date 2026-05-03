# Bank Evidence Lifecycle Rehearsal

Sprint 4T validates the operator evidence lifecycle API surface for package/certificate metadata.

SwimPay remains a Payment Signal Engine. Evidence lifecycle rehearsal does not process bank notifications, does not create official bank confirmation, does not enable Android payment confirmation and does not enable auto-confirmation.

## Scope

This rehearsal covers:

- pending operator review evidence;
- review-only approval;
- rejection;
- deprecation;
- redacted audit trace visibility;
- operator dashboard summaries.

It does not cover:

- real bank notification processing;
- installed-app enumeration;
- production trust approval;
- payment matching changes;
- auto-confirmation enablement.

## Dashboard API

Operators can request a safe lifecycle dashboard:

```powershell
$headers = @{ Authorization = "Bearer change_me_local_admin_token" }
Invoke-WebRequest -UseBasicParsing `
  http://localhost:8080/v1/admin/bank-evidence/review-dashboard `
  -Headers $headers
```

The response includes:

- `total_count`
- `counts_by_status`
- `review_queue`
- `recent_evidence`
- `next_actions`
- `safety`

Evidence rows include masked certificate hashes only. The dashboard always keeps:

```json
{
  "trusted": false,
  "production_trust_requested": false,
  "auto_confirm_enabled": false
}
```

## Sprint 4U CLI Rehearsal

Sprint 4U adds a local operator rehearsal helper:

```powershell
npm run rehearsal:evidence -- --plan
```

The plan is non-destructive. It shows the dashboard, audit trace and guardrail checks the operator should rehearse.

To run the non-mutating local API checks against the Compose proxy:

```powershell
$env:SWIMPAY_BASE_URL = "http://localhost:8080"
$env:SWIMPAY_ADMIN_TOKEN = "change_me_local_admin_token"
npm run rehearsal:evidence
```

This checks:

- dashboard certificate values are masked;
- dashboard safety keeps `trusted: false`;
- dashboard safety keeps `production_trust_requested: false`;
- dashboard safety keeps `auto_confirm_enabled: false`;
- evidence audit traces do not expose raw phone values, raw notification text, raw title/body, secrets or full certificate hashes.

Production trust dry-run guard validation is optional because it mutates a local review-only evidence row into `production_trust_requested`. Use it only against local/dev data and only with an explicit evidence id:

```powershell
$env:SWIMPAY_EVIDENCE_ID = "<approved-review-only-evidence-id>"
$env:SWIMPAY_OPERATOR_ID = "dev_operator"
npm run rehearsal:evidence
```

Expected guard result:

- request may create `production_trust_requested`;
- same-actor approval must return `bank_evidence_dual_control_required`;
- responses keep `trusted: false`;
- responses keep `auto_confirm_enabled: false`.

## Audit Trace Filters

Evidence audit traces can be narrowed without exposing raw evidence values:

```powershell
Invoke-WebRequest -UseBasicParsing `
  "http://localhost:8080/v1/admin/audit-events?object_type=bank_package_evidence&object_id=<evidence-id>&event_type=bank_evidence.approved_review_only&actor_id=<operator-id>" `
  -Headers $headers
```

Supported evidence trace filters:

- `event_type`
- `object_type`
- `object_id`
- `actor_id`
- `created_after`
- `created_before`
- `limit`

Audit payloads must remain redacted. They must not contain raw phone, raw notification text, raw title/body, secrets, API keys or private keys.

## Operator Safety Checks

During rehearsal, operators should confirm:

- review-only approval leaves `trusted: false`;
- review-only approval leaves `auto_confirm_enabled: false`;
- deprecated evidence remains auditable and cannot be production trusted;
- synthetic evidence remains test-only;
- real package evidence remains pending or review-only unless the separate dual-control production trust policy is deliberately invoked.
