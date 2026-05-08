# Task 660 - Backend public key signature verification

Verify Receiver signal signatures server-side with registered public key.

Requirements:
- Verify ECDSA P-256 SHA-256 signatures using stored public key PEM.
- Reject missing/invalid signatures.
- Reject HMAC/shared verification keys for real Receiver upload.
- Preserve event_id uniqueness, notification_hash uniqueness, local_counter monotonicity and timestamp checks.
- Preserve raw notification rejection.

Deliverable:
- Updated API verifier and tests.
