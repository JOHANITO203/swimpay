# Task 657 - Android Keystore keypair generation

Implement Android-side asymmetric Receiver keypair generation/loading.

Requirements:
- Use Android Keystore.
- Generate private key on device.
- Private key never leaves device.
- Export public key as PEM for backend registration.
- Stable namespaced alias.
- EC P-256 / SHA256withECDSA unless repo constraints require another safe algorithm.
- Handle existing keypair and missing/rotation-needed state.

Deliverable:
- Android Keystore signer implementation and tests.
