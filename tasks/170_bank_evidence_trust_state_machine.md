# Task 170 - Bank Evidence Trust State Machine

Status: completed

Added explicit production trust evidence statuses:

- `production_trust_requested`
- `production_trust_approved`
- `production_trust_revoked`

Allowed path:

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

Direct pending-to-approved trust transition is blocked.
