# 165 - Evidence Audit Trace Validation

Status: completed

Goal: validate that evidence submission and review are auditable without exposing PII.

Requirements:

- Verify audit event `bank_evidence.submitted`.
- Verify audit event `bank_evidence.reviewed`.
- Verify audit event `bank_evidence.approved_review_only`.
- Verify audit event `bank_evidence.rejected`.
- Confirm audit payloads are redacted.
- Confirm cert hashes are masked where shown.
- Confirm no raw phone, raw notification text, secrets or API keys appear.

Out of scope:

- External log aggregation.
- Raw evidence payload storage.
