# Task 351 - Receiving Route Storage and API

Status: completed in Sprint 7B.

Scope:
- Add additive storage for merchant receiving routes.
- Add merchant CRUD endpoints for receiving routes.
- Expose buyer-safe route summaries only after receiver-bank selection.
- Persist checkout receiving-route selection separately from payer launcher selection.

Safety:
- Raw receiver card/phone is not returned in API responses.
- Route identifiers are protected at rest and masked in buyer/admin output.
- Route selection does not enable auto-confirmation or official bank confirmation.
