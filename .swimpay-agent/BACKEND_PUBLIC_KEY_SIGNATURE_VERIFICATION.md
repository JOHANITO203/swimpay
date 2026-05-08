# Backend Public Key Signature Verification

Result: implemented.

- Backend verifier uses registered PEM public keys.
- Supported receiver algorithm is `ecdsa_p256_sha256_der_v1`.
- Invalid/missing signatures are rejected.
- Non-PEM/shared `spk_` keys are rejected as invalid public keys.
- `payload_hash` is validated before signature acceptance.
- Existing anti-replay protections remain in place.
