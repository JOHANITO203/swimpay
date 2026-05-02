# Bank App Package and Certificate Verification

## Purpose

SwimPay must not trust package names blindly.

## Required verification

For each bank app:

```text
package_name
signing_certificate_sha256
app_version
install_source if available
device_id
observed_at
verified_by_operator
```

## Rules

```text
package_name alone is not enough
certificate fingerprint must be verified
unknown package = review_only
unknown certificate = review_only
changed certificate = operator review
```

## Android collection

The Android Receiver should collect package metadata through Android PackageManager.

Do not hard-code real package names unless verified.

## Repository status

All V1 profiles in this pack use:

```text
package_name: TO_VERIFY
cert_sha256: TO_VERIFY
verification_status: pending_verification
```

This is intentional.
