# Task 658 - Receiver public key registration contract

Update Receiver registration to send the Android Keystore public key.

Requirements:
- Backend stores public key only.
- Android never sends a private key or shared signing secret.
- Registration rejects blank/non-public-key payloads where feasible.
- Real runtime does not create `spk_` shared signing keys.

Deliverable:
- Updated Android registration contract and backend/contract tests.
