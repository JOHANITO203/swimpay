# packages/security AGENTS.md

This package owns HMAC, signatures, hashing, masking and crypto helpers.

Read before coding here:

- root `AGENTS.md`;
- `docs/11_SECURITY_AND_PRIVACY.md`;
- `SECURITY.md`.

Rules:

- Never log secrets.
- Never store API keys raw.
- Mask phone numbers in UI outputs.
- HMAC matching identifiers.
- Signature verification must be tested.
