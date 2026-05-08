# Receiver Signing Guardrails

Added/updated guardrails:

- Contract test rejects shared `spk_` registration keys.
- Contract test requires `payload_hash` in receiver upload.
- API tests verify asymmetric public-key signatures.
- API tests reject shared HMAC verification keys.
- Static guardrail blocks HMAC imports/shared signing key vocabulary in real runtime.
- Android tests ensure runtime outbox includes `payload_hash` and signs through `PayloadSigner`.

Validation:

- Full Vitest suite passed.
- Full Android JVM tests passed.
- Android debug APK build passed.

No real notification was processed.
