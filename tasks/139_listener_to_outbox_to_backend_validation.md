# Task 139 - Listener To Outbox To Backend Validation

Status: completed

## Goal

Validate the live synthetic notification path through persistent outbox and backend upload.

## Expected Flow

```text
synthetic notification
-> listener capture
-> snapshot extractor
-> coalescer
-> privacy firewall
-> signed payload
-> persistent outbox
-> backend upload
```

## Expected Result

- Backend returns accepted/backend-decision-pending or safe review path.
- `official_bank_confirmation` is never true.
- Android never confirms or auto-confirms payment.
- `TO_VERIFY` real bank metadata remains untrusted.
