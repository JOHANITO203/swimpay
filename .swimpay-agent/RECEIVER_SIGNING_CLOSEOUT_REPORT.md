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
- First upload reached staging but returned `401 invalid_signature` before backend redeploy.
- After pushing/redeploying `main`, the proof advanced past signature verification and exposed one stale synthetic outbox record with `timestamp_out_of_range`.
- Fixed the Android notification identity split:
  - `notification_hash` now includes snapshot time so repeated notification events do not dedupe against stale outbox records;
  - `semantic_hash` remains stable for equivalent notification shape/content.
- Final staging proof passed:
  - `staging_proof_upload success=true acked=1 failed_retrying=0 status=201 code=none purged=1`
- Clean final rerun after the last push/redeploy passed:
  - `staging_proof_upload success=true acked=1 failed_retrying=0 status=201 code=none purged=0`

## Validation Notes

- Targeted Android red/green regression passed for event-time-sensitive `notification_hash` and stable `semantic_hash`.
- Full `npm test` passed: 74 test files, 528 tests.
- `npm run android:doctor`, `npm run typecheck`, `npm run lint`, `npm run build` and Compose config validation passed.
- Full Android JVM tests passed when `ANDROID_HOME` / `ANDROID_SDK_ROOT` were provided from the local SDK.
- Android debug and staging APK builds passed.
- `git diff --check` passed.

## Next Step

Continue the remaining synthetic ladder: active payment intent, active receiving method, merchant manual review and final-only webhook rehearsal. Real notification capture remains gated until those pass and the operator gives the explicit capture-start command.
