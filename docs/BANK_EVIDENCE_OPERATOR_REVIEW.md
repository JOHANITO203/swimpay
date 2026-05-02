# Bank Evidence Operator Review

## Purpose

Sprint 4M adds a backend/admin workflow for Android PackageManager package/certificate evidence.

The workflow is review-only. Evidence is not bank proof, not payment proof and not official bank confirmation.

## Data Model

Evidence is stored in `bank_package_evidence` with:

- `id`
- `merchant_id`
- `device_id`
- `bank_profile_id`
- `package_name`
- `cert_sha256`
- `app_version`
- `install_source`
- `source`
- `status`
- `created_at`
- `reviewed_at`
- `reviewed_by`
- `review_reason`

Allowed statuses:

- `pending_operator_review`
- `approved_for_review_only`
- `rejected`
- `deprecated`

There is intentionally no `trusted` evidence status in Sprint 4M.

## Receiver Intake

Endpoint:

```http
POST /v1/bank-evidence
```

The request must use the local receiver/merchant auth foundation and include:

```json
{
  "device_id": "dev_...",
  "bank_profile_id": "sberbank_ru",
  "package_name": "operator.selected.package",
  "cert_sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "app_version": "0.1.0-debug",
  "install_source": "debug_explicit_package_selection",
  "source": "android_packagemanager"
}
```

Response:

```json
{
  "evidence_id": "bev_...",
  "status": "pending_operator_review",
  "next_action": "operator_review_required",
  "trusted": false,
  "auto_confirm_enabled": false,
  "message": "evidence accepted for operator review; not trusted yet; no auto-confirm enabled"
}
```

`TO_VERIFY` package/cert values are rejected by the intake endpoint. Synthetic debug evidence may be submitted for automated local tests, but remains non-production trust evidence.

## Admin Review API

List evidence:

```http
GET /v1/admin/bank-evidence
```

Read one evidence row:

```http
GET /v1/admin/bank-evidence/{id}
```

Approve for review-only:

```http
POST /v1/admin/bank-evidence/{id}/approve-review-only
```

Reject:

```http
POST /v1/admin/bank-evidence/{id}/reject
```

Viewing requires `view_bank_templates`. Approval requires `promote_bank_templates`. Rejection uses the same dangerous-action boundary as bank-template degradation.

Approval sets only:

```text
approved_for_review_only
```

It does not:

- mark the bank profile trusted;
- mark a bank app signature verified;
- enable template auto-confirmation;
- confirm any payment.

## Audit Events

Audit events:

- `bank_evidence.submitted`
- `bank_evidence.reviewed`
- `bank_evidence.approved_review_only`
- `bank_evidence.rejected`

Payloads contain masked certificate hashes and redacted operator reasons only.

## Android Debug Submit Flow

The debug Receiver can submit synthetic PackageManager evidence through `/v1/bank-evidence`.

Rules:

- explicit package only;
- no installed-app enumeration;
- no real bank notification;
- no raw phone;
- no raw notification text;
- debug wording says evidence is for operator review, not trusted yet and no auto-confirm is enabled.

## Not Implemented

- No production trust policy.
- No real bank package/cert dry run.
- No real bank notifications.
- No payment confirmation changes.
- No Android-side payment decision.
