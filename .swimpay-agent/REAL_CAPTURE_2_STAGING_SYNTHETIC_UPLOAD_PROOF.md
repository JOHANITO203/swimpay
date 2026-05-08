# REAL-CAPTURE-2 Staging Synthetic Upload Proof

generated_at: 2026-05-08T21:53:31+03:00

No real bank notifications were processed.

## Objective

Re-run the installed staging APK synthetic signed upload proof after the public checkout session fix was pushed.

## Device

- Android device: `SM-S916B`
- ADB serial: `adb-R5CWA0FEPZW-Xl6cnq._adb-tls-connect._tcp`
- APK package: `com.swimpay.receiver`
- Action: `com.swimpay.receiver.STAGING_PROOF`

## Result

Passed.

Logcat evidence:

```text
SwimPayStagingProof: staging_proof_upload success=true acked=1 failed_retrying=0 status=201 code=none purged=0
```

## Boundaries Preserved

- Synthetic signal only.
- No real bank notification was read.
- No raw notification text was stored or uploaded.
- Android did not confirm an order.
- Android did not send a developer webhook.
- Backend accepted the redacted signed signal with HTTP 201.
- The upload proof does not prove final webhook fulfillment; that remains a separate SDK/manual-review rehearsal.

## Remaining Gates

- Staging SDK order creation with real staging API key.
- Hosted checkout route selection without dev bearer after Dokploy redeploy of `d45ba7f`.
- Active payment intent + active receiving method proof.
- Manual review confirmation proof.
- Final-only `payment.confirmed` webhook delivery to external staging app.
- Explicit operator capture-start command before any real notification capture.

