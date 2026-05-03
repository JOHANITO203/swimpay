# 196 Evidence Operator Review Dashboard Model

Status: completed

## Goal

Create backend/admin DTOs for operator bank package evidence review.

## Completed

- Added `submitted_at` and `production_trust_status` to admin evidence responses.
- Kept certificate hashes masked as `cert_sha256_masked`.
- Kept `trusted: false` and `auto_confirm_enabled: false` in review DTOs.
- Did not expose raw phone, raw notification text or full certificate hash in public/admin evidence responses.
