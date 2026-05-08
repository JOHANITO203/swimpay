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
- Debug smoke HMAC remains isolated and cannot be used by non-debug runtime.

## Validation Notes

- Targeted JS receiver-signing tests passed.
- Full `npm test` passed: 74 test files, 528 tests.
- `npm run android:doctor`, `npm run typecheck`, `npm run lint`, `npm run build` and Compose config validation passed.
- Full Android JVM tests passed when `ANDROID_HOME` / `ANDROID_SDK_ROOT` were provided from the local SDK.
- Android debug APK build passed.
- `git diff --check` passed with a CRLF normalization warning for `.swimpay-agent/TASK_QUEUE.md`.

## Next Step

Build/install updated staging APK, re-register receiver, then run synthetic redacted upload proof. No real notification capture before that proof.
