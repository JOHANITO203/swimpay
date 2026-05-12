# Ozon Bank Runtime Verified Report

generated_at: 2026-05-12T22:55:00+03:00

## Decision Applied

Ozon Bank is now treated as operator runtime-verified for V1 manual-review-only use.

Contract values:

- `bank_id`: `ozon_bank`
- `display_name`: `Ozon Банк`
- `selectable`: `true`
- `supported_roles`: `sender_bank`, `receiver_bank`
- `runtime_capture_status`: `runtime_verified`
- `runtime_verified`: `true`
- `runtime_verified_by`: `operator`
- `runtime_verified_at`: `2026-05-12T00:00:00.000Z`
- `package_name`: `ru.ozon.fintech.finance`
- `package_cert_sha256`: `documented_unknown`
- `runtime_evidence_source`: `operator_runtime_test`
- `auto_confirm_enabled`: `false`
- `official_bank_confirmation`: `false`

## Files Changed

- `packages/contracts/src/index.ts`
- `packages/database/migrations/021_ozon_bank_runtime_verified.sql`
- `packages/bank-templates/banks/ozon_bank/profile.yml`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/BankTargetLock.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/BankProfileSelection.kt`
- `apps/android-receiver/android/app/src/main/AndroidManifest.xml`

## Guardrails

Runtime verified means selectable and operator-observed capability only. It does not mean official bank confirmation and does not enable auto-confirmation.
