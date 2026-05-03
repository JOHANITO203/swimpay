# Task 172 - Trust Transition Audit And Dual Control

Status: completed

Added redacted audit events:

- `bank_evidence.production_trust_requested`
- `bank_evidence.production_trust_approved`
- `bank_evidence.production_trust_revoked`

Dual-control is enforced: the operator who requests production trust cannot approve the same evidence.

Audit payloads include evidence id, bank profile id, package name, masked certificate hash, actor id and redacted reason. They do not include raw notification text, raw phone, secrets or API keys.
