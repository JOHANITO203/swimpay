# Task 662 - Receiver signing guardrails

Add guardrails preventing shared-key signing from returning to real runtime.

Tests should fail if:
- Real runtime imports/uses HMAC signing.
- Runtime config persists `signing_key`/`spk_`.
- Android registration sends a shared signing key.
- Backend accepts HMAC signatures for Receiver signal upload.
- Private key is exposed or sent over network.

Deliverable:
- Guardrail tests and report.
