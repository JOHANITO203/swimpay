# 203 Evidence Review Dashboard API

Status: completed

## Goal

Add a safe admin API summary for evidence lifecycle rehearsal.

## Completed

- Added `GET /v1/admin/bank-evidence/review-dashboard`.
- Requires `view_bank_templates`.
- Returns masked evidence rows, status counts, review queue and safe next actions.
- Keeps `trusted: false`, `production_trust_requested: false` and `auto_confirm_enabled: false`.

