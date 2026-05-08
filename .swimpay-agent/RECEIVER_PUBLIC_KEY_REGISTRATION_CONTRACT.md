# Receiver Public Key Registration Contract

Result: implemented.

- Android registration sends `public_key` as PEM from Android Keystore.
- Contract validation rejects blank/non-PEM and `spk_` shared-key values.
- Backend keeps storing the value in `receiver_devices.public_key`; no DB migration is required.
- Existing staging devices registered with old `spk_` values must re-register.

No private key is sent over the network.
