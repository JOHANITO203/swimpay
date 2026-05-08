# Task 659 - Asymmetric signal envelope signing

Sign Receiver signal upload envelopes with the Android Keystore private key.

Requirements:
- Signed payload includes event_id, device_id, merchant_id, notification_hash, semantic_hash when present, local_counter, observed_at, payload_hash and all redacted signal fields.
- Payload hash is generated before signature and included in the uploaded JSON.
- Outbox stores redacted signed payload only.
- No raw notification text, raw phone/card, account data or secrets.

Deliverable:
- Updated Android runtime outbox signing path and tests.
