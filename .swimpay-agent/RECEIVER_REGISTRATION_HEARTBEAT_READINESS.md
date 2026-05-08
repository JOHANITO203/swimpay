# Receiver Registration / Heartbeat Readiness

Date: 2026-05-08

No real notifications were processed.

## Result

Status: partial, blocked by installed APK staging proof and signing-model hardening decision.

Backend registration and heartbeat contracts are tested. The installed staging APK still needs proof that it registers, stores runtime config and heartbeats against the VPS.

## Evidence

- `apps/api/src/receiver-devices.ts`
- `apps/api/src/receiver-devices.test.ts`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt`
- `ReceiverRuntimeConfigStore.kt`
- `PersistentDeviceStateStore.kt`
- `AndroidMerchantApiWiringTest.kt`

## Checks

| Check | Status | Notes |
| --- | --- | --- |
| Receiver registration | ready in API tests | BFF and Android mobile session paths tested. |
| Receiver public key stored | partial | Stored field works, but currently carries HMAC verification key. |
| Private key never sent | partial | No asymmetric private key is sent because true asymmetric identity is not implemented yet. |
| Heartbeat states | ready in API tests | `active`, `notification_access_missing`, `bank_targets_missing` tested. |
| bank_targets_missing | ready | Covered by heartbeat test. |
| notification_access_missing | ready | Covered by heartbeat test. |
| active | ready | Covered by heartbeat test. |

## Blocker

For production-ready receiver identity, migrate from HMAC shared verification key in `public_key` to true Android Keystore asymmetric public-key registration. For controlled staging capture, operator must explicitly accept the current HMAC foundation if not fixed first.

