# 158 - Bank Evidence Audit Events

## Goal

Audit evidence submission and operator review.

## Events

- `bank_evidence.submitted`
- `bank_evidence.reviewed`
- `bank_evidence.approved_review_only`
- `bank_evidence.rejected`

## Safety

- Payloads must be redacted.
- Include operator id for admin review.
- Do not include secrets, raw notification text or phone data.
