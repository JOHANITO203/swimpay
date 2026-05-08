# Task 661 - Receiver signing migration compatibility

Quarantine old HMAC/shared signing path.

Requirements:
- Existing debug-only synthetic smoke may retain HMAC with explicit debug isolation.
- Real runtime must use asymmetric Keystore signing.
- Existing stored `spk_` values must not be used for production uploads.
- Document any compatibility impact for already registered staging devices.

Deliverable:
- Migration/compatibility notes and code guardrails.
