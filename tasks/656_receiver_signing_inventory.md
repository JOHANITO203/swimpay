# Task 656 - Receiver signing inventory

Audit current Android Receiver signing before implementation.

Scope:
- Android signing classes and runtime outbox path.
- Receiver registration payload and backend schema usage.
- Backend signal verification code.
- HMAC/shared verification key generation and persistence.
- Tests and docs depending on HMAC vocabulary.

Deliverable:
- `.swimpay-agent/RECEIVER_SIGNING_INVENTORY.md`

Rules:
- Do not process real notifications.
- Do not implement before this inventory is recorded.
- Classify HMAC runtime path, target asymmetric path, migration needs, compatibility needs and tests to update.
