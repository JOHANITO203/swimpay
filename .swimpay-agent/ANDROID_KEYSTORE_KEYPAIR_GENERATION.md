# Android Keystore Keypair Generation

Result: implemented.

- `AndroidKeystorePayloadSigner` now generates/loads an Android Keystore EC P-256 keypair.
- The private key stays inside Android Keystore.
- The public key is exported as PEM for backend registration.
- `keyId()` derives a safe SHA-256 public-key fingerprint prefix.
- `FakePayloadSigner` remains debug/test-only and is rejected by production signing policy.

No real notification was processed.
