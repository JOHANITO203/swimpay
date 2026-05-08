# Asymmetric Signal Envelope Signing

Result: implemented.

- Non-debug runtime outbox signs redacted payloads through `PayloadSigner`.
- Signal payloads include `payload_hash` before signature.
- Signature is over canonical deterministic JSON excluding `signature`.
- Outbox stores redacted signed JSON only.
- Runtime HMAC imports and shared signing key usage were removed from `ReceiverRuntimeOutboxController`.

Debug smoke HMAC remains isolated in `DebugReceiverSmokeController`.
