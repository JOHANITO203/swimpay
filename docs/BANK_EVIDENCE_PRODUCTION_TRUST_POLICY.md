# Bank Evidence Production Trust Policy

SwimPay is a Payment Signal Engine. Bank package/certificate evidence can help operators decide whether app metadata is suitable for production use, but it is not official bank confirmation and it is not a payment decision.

## Trust Levels

`approved_for_review_only` means an operator reviewed the evidence for review-only receiver readiness. It does not make the bank app trusted and does not enable auto-confirmation.

`production_trust_approved` means only:

```text
this bank app package/cert evidence is accepted as verified app metadata
```

It does not mean a payment was confirmed. It does not make SwimPay a bank or PSP. It does not enable auto-confirmation by itself.

## State Machine

Allowed statuses:

- `pending_operator_review`
- `approved_for_review_only`
- `rejected`
- `deprecated`
- `production_trust_requested`
- `production_trust_approved`
- `production_trust_revoked`

Allowed production trust path:

```text
pending_operator_review
-> approved_for_review_only
-> production_trust_requested
-> production_trust_approved
```

Revocation:

```text
production_trust_approved -> production_trust_revoked
```

Direct `pending_operator_review -> production_trust_approved` is blocked.

Deprecation is non-destructive:

```text
pending_operator_review | approved_for_review_only | rejected -> deprecated
```

Deprecated evidence is retained for audit/history and cannot request or regain production trust. If a package certificate changes, submit a new evidence row and review it separately.

## Required Evidence

Production trust requires:

- concrete `package_name`;
- concrete `cert_sha256`;
- source `android_packagemanager`;
- evidence submitted by a registered Receiver device;
- explicit `bank_profile_id` match;
- prior operator review as `approved_for_review_only`;
- a production trust request;
- approval by a second operator/admin actor.

Production trust is forbidden for:

- `TO_VERIFY` values;
- `synthetic_debug_only` evidence;
- rejected evidence;
- deprecated evidence;
- pending evidence;
- non-PackageManager evidence.

Exact duplicate evidence is idempotent and does not create trust. A changed certificate for the same package requires a new operator review row.

## RBAC

Dedicated permissions:

- `request_bank_evidence_production_trust`
- `approve_bank_evidence_production_trust`
- `revoke_bank_evidence_production_trust`

In V1 these permissions are restricted to owner/admin roles. Read-only, support and normal operator roles cannot approve production trust.

Dual control is enforced: the actor who requests production trust cannot approve the same request.

## API

Admin endpoints:

```http
POST /v1/admin/bank-evidence/:id/request-production-trust
POST /v1/admin/bank-evidence/:id/approve-production-trust
POST /v1/admin/bank-evidence/:id/revoke-production-trust
```

Responses keep:

```json
{
  "trusted": false,
  "auto_confirm_enabled": false
}
```

`production_trusted_app_metadata` is separate from payment auto-confirm eligibility.

## Operator UI Boundary

The Sprint 4V operator web surface is read-only. It may display redacted dashboard and audit information for an audit drill, but it must not:

- request production trust;
- approve production trust;
- revoke production trust;
- enable auto-confirmation;
- display full certificate hashes;
- display raw notification or phone data.

Production trust changes remain API/admin actions protected by RBAC and dual-control.

## Handoff Drill Boundary

Sprint 4W adds a CLI handoff drill for local/dev operator rehearsal. The drill is non-mutating by default and mutates only when an explicit evidence id, requester token, approver token and `SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF=true` are provided.

The expected drill path is:

```text
approved_for_review_only
-> production_trust_requested by requester
-> same requester approval blocked
-> production_trust_approved by second operator
-> production_trust_revoked after drill
```

Do not weaken RBAC to fake a second operator. Compose `dev_token` mode represents one local operator and is not sufficient for full dual-operator approval proof.

Sprint 4X adds a signed-token local rehearsal. It uses the real `signed_token` authorization path with two distinct signed operators, then revokes the metadata trust after approval. This validates dual-control locally without changing production trust policy and without enabling auto-confirmation.

Sprint 4Y adds a local-only signed-token Docker Compose override and operational playbook. It allows a deliberate persisted local handoff drill while keeping the same state machine, dual-control and revocation requirements. The default Compose file remains `dev_token`; signed-token Compose mode must be selected explicitly.

## Audit

Required audit events:

- `bank_evidence.production_trust_requested`
- `bank_evidence.production_trust_approved`
- `bank_evidence.production_trust_revoked`

Audit payloads include:

- evidence id;
- bank profile id;
- package name;
- masked certificate hash;
- actor/operator id;
- redacted reason;
- `auto_confirm_enabled: false`.

Audit payloads must not include raw notification text, raw phone, secrets, API keys or private keys.

## Auto-confirm Separation

Production-trusted app metadata is only one future prerequisite. Auto-confirmation remains disabled unless all independent gates pass:

- trusted Receiver device;
- trusted or trusted-low-amount bank profile;
- reliable template;
- exact amount and currency;
- exact phone or reference match;
- no collision;
- unique event and notification hash;
- no negative category;
- score threshold met.

This sprint does not enable auto-confirmation.

## Real Notification Boundary

Do not process real bank notifications during trust review. Package/certificate trust review is a metadata workflow only.
