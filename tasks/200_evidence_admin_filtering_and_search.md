# 200 Evidence Admin Filtering And Search

Status: completed

## Goal

Improve admin evidence review list filtering without installed-app enumeration or raw PII.

## Completed

- Added filters to `GET /v1/admin/bank-evidence`:
  - `status`
  - `bank_profile_id`
  - `package_name`
  - `source`
  - `submitted_after`
  - `submitted_before`
- Kept pagination through `limit`.
- Filters are exact metadata filters only and do not enumerate installed apps.
