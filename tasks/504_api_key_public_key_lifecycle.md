# Task 504 — API key / public key lifecycle

Status: completed

Scope:
- Added merchant-scoped public key generation.
- Added secret key generate/rotate endpoints with show-once response semantics.
- Existing active API keys are revoked on rotation.

Safety:
- Secret key is hashed for storage.
- Normal reads never return raw secret keys.

