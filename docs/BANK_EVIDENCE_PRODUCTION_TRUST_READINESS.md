# Bank Evidence Production Trust Readiness

This document is the operator-facing readiness package for bank package/certificate metadata production trust.

SwimPay remains a Payment Signal Engine. Production trust means only that a bank app package/certificate metadata record has passed the operator trust workflow. It is not official bank confirmation and it does not enable payment auto-confirmation.

## Status

Sprint 4Y completed the local signed-token Compose handoff rehearsal.

Evidence `878ddd87-2e69-40b1-9cc7-da15d95a6b0b` completed the drill and ended with:

- status: `production_trust_revoked`
- trusted: `false`
- production_trusted_app_metadata: `false`
- auto_confirm_enabled: `false`

## Required Artifacts

- `.swimpay-agent/SPRINT_4Y_REPORT.md`
- `.swimpay-agent/BLOCKERS.md`
- `docs/BANK_EVIDENCE_SIGNED_COMPOSE_HANDOFF_PLAYBOOK.md`
- `docs/BANK_EVIDENCE_PRODUCTION_TRUST_HANDOFF.md`
- `docs/BANK_EVIDENCE_OPERATOR_RUNBOOK.md`
- `docs/BANK_EVIDENCE_PRODUCTION_TRUST_POLICY.md`
- `docs/11_SECURITY_AND_PRIVACY.md`
- `infra/docker-compose.signed-admin.override.yml`
- `scripts/operator-token-helper.mjs`
- `scripts/evidence-production-trust-compose-signed-rehearsal.mjs`

## Preflight Gate

Before any future handoff drill:

1. Confirm there are no critical blockers.
2. Confirm Docker Compose services are healthy.
3. Confirm `http://localhost:8080/api-health` returns HTTP 200.
4. Confirm the target evidence is already `approved_for_review_only`.
5. Confirm requester and approver are distinct operators.
6. Confirm signed-token mode is deliberate and local-only unless a separate production identity system is approved.
7. Confirm no real bank notifications are processed.
8. Confirm no customer data, SMS, app scraping or installed-app enumeration is used.

## Operator Identity Gap

The local signed token helper is a rehearsal tool. It is not production operator lifecycle tooling.

Before production use, SwimPay needs an explicit operator identity plan:

- operator onboarding;
- credential issuance;
- credential rotation;
- credential revocation;
- secure secret storage;
- break-glass access;
- audit review;
- separation between requester, approver and revoker duties.

Sprint 5A adds the operator identity and secret lifecycle package in `docs/OPERATOR_IDENTITY_SECRET_LIFECYCLE.md`.

Run the non-mutating identity readiness gate:

```powershell
npm run operator:identity-readiness
```

## Evidence Dossier Format

Each future production trust candidate should have a dossier containing:

- evidence id;
- bank profile id;
- package name;
- masked cert hash;
- cert provenance;
- collection source;
- collection timestamp;
- device id or collection station id;
- requester id;
- approver id;
- review reason;
- expiry or reverification date;
- drift response owner.

Do not include full certificate hashes in general operator reports unless a separate admin-only policy explicitly allows it.

## Audit Expectations

Required events:

- `bank_evidence.production_trust_requested`
- `bank_evidence.production_trust_approved`
- `bank_evidence.production_trust_revoked`

Audit payloads must stay redacted and include masked certificate hashes only.

## Rollback and Incident Boundaries

Revoke metadata trust immediately if:

- the wrong package was approved;
- the wrong certificate was approved;
- dual-control was bypassed;
- an operator token was exposed;
- audit continuity is missing;
- raw PII appears in any payload;
- real notifications were processed during a trust review;
- package/cert drift is detected.

Rollback must not delete evidence. It must create audit events and leave auto-confirmation disabled.

## Monitoring Expectations

Future monitoring should flag:

- stale `production_trust_requested`;
- unexpected `production_trust_approved`;
- missing revocation after rehearsal;
- missing audit events;
- repeated signed-token auth failures;
- new cert evidence for the same package;
- redaction failures.

## Production Readiness Decision

Sprint 4Z readiness is enough to package the operator handoff process. It is not enough to process real bank notifications.

Real bank notification testing requires a separate future readiness review.
