# Receiver Signing Staging Proof

Status: Android staging registration proof passed; signed upload proof requires backend redeploy from `main`.

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

Current staging server result before redeploy:

- Broadcast ran and reached backend.
- Backend response: `status=401 code=invalid_signature`.
- Root cause assessment: local repository is ahead of `origin/main`, so Dokploy staging is likely still running the pre-push backend contract while the APK signs with the new asymmetric Keystore path.
- Required action: push current commits and let Dokploy redeploy, then rerun the staging proof broadcast.

Required next proof:

1. Push `main` and redeploy Dokploy.
2. Install updated staging APK if Dokploy/backend changed after the APK build.
3. Run `adb shell am broadcast -a com.swimpay.receiver.STAGING_PROOF -p com.swimpay.receiver`.
4. Expect `staging_proof_upload success=true acked=1 failed_retrying=0`.
5. Only after that, proceed to supervised real bank notification testing.

Real bank notification capture remains gated.
