# Receiver Signing Inventory

Date: 2026-05-08
Sprint: RECEIVER-SIGN-1

## Current HMAC Path

| Area | Files | Finding | Status |
|---|---|---|---|
| Runtime config | `ReceiverRuntimeConfigStore.kt` | Persists app-generated `spk_` signing key in SharedPreferences. | must replace |
| Runtime outbox | `ReceiverRuntimeOutboxController.kt` | Signs upload JSON with `HmacSHA256(signingKey, stableDebugJson(payload))`. | must replace |
| Registration | `AndroidReceiverDeviceApiRepository.registerAndHeartbeat` | Sends shared `signingKey` as `public_key`. | must replace |
| Listener runtime | `SwimPayNotificationListenerService.kt` | Non-debug listener wires `signingKey` into runtime outbox. | must replace |
| Backend verifier | `apps/api/src/signals.ts` | Treats registered `public_key` as HMAC verification key. | must replace |
| Contract vocabulary | `packages/contracts/src/index.ts` | Only declares `hmac_sha256_canonical_v1`. | must update |
| Docs | `docs/11_SECURITY_AND_PRIVACY.md`, `docs/ANDROID_RECEIVER_CONTRACT.md`, `.swimpay-agent/*` | Describe HMAC as current foundation / asymmetric as future work. | stale after sprint |

## Existing Target Pieces

| Area | Files | Finding | Status |
|---|---|---|---|
| Android Keystore signer | `AndroidKeystorePayloadSigner.kt` | Existing EC signer skeleton signs canonical fields but does not expose public key PEM/key id and is not wired into runtime. | partial |
| Production signer policy | `ReceiverSigningPolicy` | Rejects `FakePayloadSigner` in production mode. | keep and extend |
| Canonical fields | `CanonicalPayload.kt`, `CanonicalPayloadTest.kt` | Required signed fields include `payload_hash`. | keep, align with upload JSON |

## Migration Needs

- Replace runtime `signingKey` with Android Keystore public/private model.
- Register PEM public key server-side in existing `receiver_devices.public_key` column.
- Include `payload_hash` in the uploaded signal body.
- Sign the canonical uploaded payload without `signature`.
- Verify ECDSA/SHA-256 using stored public key PEM.
- Reject non-PEM/HMAC receiver keys for real signal upload.

## Backward Compatibility

- Existing registered staging devices that used `spk_` keys must re-register after installing the new APK.
- Debug-only synthetic smoke may keep HMAC if isolated in `DebugReceiverSmokeController`; it must not be used by non-debug runtime.
- No database migration is required because `receiver_devices.public_key TEXT` can store PEM.

## Tests To Update

- `apps/api/src/signals.test.ts`
- `apps/api/src/receiver-devices.test.ts`
- `packages/contracts/src/android-receiver.test.ts`
- `packages/contracts/src/intelligence.test.ts`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidReceiverRealRuntimeTest.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantApiWiringTest.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/security/DeviceIdentityHardeningTest.kt`

## Decision

HMAC/shared verification key is quarantined to debug-only local smoke. Real Android Receiver runtime must use asymmetric Android Keystore signing before real notification capture.
