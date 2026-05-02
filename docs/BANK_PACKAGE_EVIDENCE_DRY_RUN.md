# Bank Package Evidence Dry Run

## Purpose

Sprint 4L prepares the Android Receiver and operator process for collecting package/certificate evidence safely.

PackageManager evidence is observation only. It is not bank proof, not payment proof and not official bank confirmation.

## Rules

- Do not auto-trust PackageManager evidence.
- Do not invent real bank package names.
- Do not invent certificate fingerprints.
- Do not use real bank notifications in this dry run.
- Do not upload raw notification text.
- Do not upload raw phone numbers.
- Android does not confirm or auto-confirm payments.

## Evidence Fields

Android may collect evidence only for an explicit operator-selected package name:

```json
{
  "bank_profile_id": "sber_ru",
  "package_name": "operator-selected-package",
  "package_cert_sha256": "sha256-from-android-packagemanager",
  "source": "package_manager_dry_run",
  "captured_at": "2026-05-03T01:40:00.000Z"
}
```

The app must not enumerate arbitrary apps for hidden collection.

## Review-only Policy

Evidence states:

- `TO_VERIFY` package or cert: review-only, not trusted.
- concrete PackageManager package/cert: `pending_verification`, operator review required.
- `synthetic_debug_only`: debug-only, not production trust evidence.

Do not auto-trust. Backend/operator verification is a separate RBAC-protected action and still does not imply a payment was confirmed.

## Real-device Dry-run Checklist

1. Keep backend local and non-production.
2. Keep Notification Listener Access enabled only if needed for synthetic debug tests.
3. Choose a package explicitly from Android settings or operator input.
4. Collect package name and certificate hash through Android PackageManager.
5. Store/report only the package name, masked cert hash, source and timestamp.
6. Submit evidence for operator review.
7. Keep the related bank profile in review-only mode until explicit verification.
8. Do not process real bank notifications during this sprint.

## Diagnostics

Operator diagnostics may show:

- bank profile id;
- package name;
- masked certificate hash;
- source;
- review decision;
- verification status;
- reason codes.

Diagnostics must not show raw phone numbers, raw notification title/body, raw payloads, API keys, private keys, signatures or secrets.

## Not Implemented

- No real bank package/cert verification result.
- No automatic promotion to trusted.
- No real bank notification testing.
- No payment confirmation behavior.
