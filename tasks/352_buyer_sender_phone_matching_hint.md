# Task 352 - Buyer Sender Phone Matching Hint

Status: completed in Sprint 7B.

Scope:
- Add optional buyer sender phone hint endpoint for checkout.
- Store only HMAC and masked phone.
- Use the hint as matching metadata only.

Safety:
- Raw buyer sender phone is not persisted, logged, audited, or exposed in webhook payloads.
- The hint never confirms payment by itself.
