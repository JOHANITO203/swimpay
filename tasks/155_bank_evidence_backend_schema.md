# 155 - Bank Evidence Backend Schema

## Goal

Add a PostgreSQL-backed model for Android PackageManager bank package/certificate evidence.

## Scope

- Create a new migration.
- Store evidence as operator-review material only.
- Do not create production trust or auto-confirmation eligibility.

## Required Fields

- `evidence_id`
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

## Statuses

- `pending_operator_review`
- `approved_for_review_only`
- `rejected`
- `deprecated`

## Safety

- No raw notification data.
- No phone data.
- No `trusted` status in this sprint.
- Prefer a new migration; do not destructively edit old migrations.
