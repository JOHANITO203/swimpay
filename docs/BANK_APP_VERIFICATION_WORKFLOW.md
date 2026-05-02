# Bank App Verification Workflow

Task: `035_bank_app_verification_workflow`

SwimPay treats Android package names and signing certificate hashes as observed metadata until an operator verifies them. `TO_VERIFY` values are never trusted automatically.

## Source Of Metadata

Android Receiver may report:

- `package_name`
- `package_cert_sha256`
- `bank_profile_id`

Those values should come from Android `PackageManager` inspection in the Android app. This repository does not invent real package names or real certificate fingerprints.

Sprint 4L adds the Android-side dry-run boundary for this evidence. PackageManager evidence is observation only and enters review-only / `pending_verification` state until an operator reviews it.

## States

`bank_app_signatures.status` may be:

- `pending_verification`
- `verified`
- `rejected`
- `revoked`

Rows with `package_name = "TO_VERIFY"` or `cert_sha256 = "TO_VERIFY"` are placeholders and cannot be verified.

## Admin Review API

List observed metadata:

```http
GET /v1/admin/bank-app-signatures
```

Requires:

```text
view_bank_templates
```

Verify an observed synthetic or real operator-reviewed signature:

```http
POST /v1/admin/bank-app-signatures/{id}/verify
```

Requires:

```text
promote_bank_templates
```

The action writes a redacted audit event:

```text
admin.bank_app_signature.verified
```

## Safety Rules

- `TO_VERIFY` package or certificate metadata returns `bank_app_signature_to_verify`.
- Unknown package/cert values remain untrusted.
- Verification does not prove a bank confirmed a payment.
- Verification does not auto-promote bank templates.
- Template promotion still requires independent evidence, no false positives and RBAC.
- Admin responses expose only masked certificate hashes.
- Android PackageManager evidence must not be auto-trusted by the app.

## Not Implemented

This task does not implement Android PackageManager collection, production identity provider integration, real certificate verification policy, automated trust, or any payment confirmation changes.
