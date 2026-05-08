# RECEIVER-SIGN-1 Closeout Report

## Summary

SwimPay Receiver signing was migrated from shared HMAC-style verification keys to Android Keystore asymmetric signing for real runtime.

## Implemented

- Android Keystore EC P-256 keypair generation/loading.
- Public key PEM registration.
- Runtime outbox `payload_hash` + asymmetric signing.
- Backend ECDSA/SHA-256 verification.
- Rejection of shared `spk_` receiver keys.
- Guardrail tests for contracts, backend and Android runtime.

## Compatibility

- Existing staging receiver registrations using old shared keys must re-register.
- Android now stores the local `receiverKeyId` with the device state.
- On app startup, a completed mobile session silently re-registers the receiver if the stored device state has no key id, has a different key id, or was recorded with stale notification access state.
- Debug smoke HMAC remains isolated and cannot be used by non-debug runtime.

## Staging Proof Update

- `app-staging.apk` was built and installed on `SM-S916B`.
- The app registered/aligned the receiver with the current Android Keystore key:
  - `registration_fresh=true registered=true message=Receiver aligne avec la cle Android`
- A staging-only ADB broadcast proof was added:
  - action: `com.swimpay.receiver.STAGING_PROOF`
  - runtime path: redacted synthetic supported-bank snapshot -> Android Keystore signature -> encrypted outbox -> `/v1/receiver/signals`
- First upload reached staging but returned `401 invalid_signature`.
- Root cause assessment: local `main` is ahead of `origin/main`; Dokploy staging likely needs the backend asymmetric verifier commit pushed/redeployed before the proof can pass.

## Validation Notes

- Targeted JS receiver-signing tests passed.
- Full `npm test` passed: 74 test files, 528 tests.
- `npm run android:doctor`, `npm run typecheck`, `npm run lint`, `npm run build` and Compose config validation passed.
- Full Android JVM tests passed when `ANDROID_HOME` / `ANDROID_SDK_ROOT` were provided from the local SDK.
- Android debug APK build passed.
- `git diff --check` passed with a CRLF normalization warning for `.swimpay-agent/TASK_QUEUE.md`.

## Next Step

Push/redeploy the asymmetric backend + staging proof changes, rerun the ADB staging proof, then proceed to real notification capture only if the proof returns `acked=1`.
