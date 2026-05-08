# Receiver Signing Staging Proof

Status: Android staging registration proof passed; signed upload proof passed.

Local validation: passed.

Device proof on 2026-05-08:

1. Built and installed `app-staging.apk` on `SM-S916B`.
2. Launched the staging APK.
3. App performed silent receiver registration freshness check.
4. Log evidence:
   - `registration_fresh=true registered=true message=Receiver aligne avec la cle Android`
   - after reinstall: `registration_fresh=true registered=false message=Receiver deja aligne`

Staging-only synthetic upload trigger:

- Added ADB-only staging broadcast action: `com.swimpay.receiver.STAGING_PROOF`.
- The trigger uses the real non-debug runtime path:
  - current mobile session;
  - current receiver runtime config;
  - Android Keystore signer;
  - redacted synthetic supported-bank snapshot;
  - encrypted outbox;
  - `/v1/receiver/signals` upload.
- It does not process real notifications.
- It does not confirm payment.
- It does not emit developer webhooks from Android.

Intermediate staging server result before backend redeploy:

- Broadcast ran and reached backend.
- Backend response: `status=401 code=invalid_signature`.
- Root cause assessment: local repository is ahead of `origin/main`, so Dokploy staging is likely still running the pre-push backend contract while the APK signs with the new asymmetric Keystore path.
- Action taken: pushed current commits and let Dokploy redeploy.

Final staging proof result after redeploy and Android proof cleanup:

- Backend accepted the asymmetric signed redacted synthetic signal.
- Log evidence:
  - `staging_proof_upload success=true acked=1 failed_retrying=0 status=201 code=none purged=1`
- The `purged=1` value was a staging-only cleanup of one old synthetic proof outbox record whose `observed_at` was outside the production timestamp window.
- Root cause of the intermediate `timestamp_out_of_range`: the old notification hash did not include snapshot time, so repeated synthetic proofs could dedupe against a stale outbox record. This is fixed by making `notification_hash` event-time-sensitive while keeping `semantic_hash` stable for shape matching.

Required next proof:

1. Keep the current staging APK installed.
2. Continue the remaining synthetic ladder: active payment intent, active receiving method, manual review and final-only webhook rehearsal.
3. Only after that, proceed to supervised real bank notification testing.

Real bank notification capture remains gated.
