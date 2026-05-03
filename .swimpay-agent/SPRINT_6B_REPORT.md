# Sprint 6B Report - Five-bank Package Evidence Collection Wave

status: PASS
generated_at: 2026-05-03T15:11:00+03:00

## Tasks Created

1. `282_limited_bank_package_discovery_authorization`
2. `283_adb_filtered_bank_package_lookup`
3. `284_operator_candidate_package_selection`
4. `285_five_bank_package_evidence_collection`
5. `286_five_bank_evidence_review_only_approval`
6. `287_five_bank_matrix_update`
7. `288_sprint_6b_closeout_review`

## Tasks Completed

All Sprint 6B tasks were completed.

## Authorization Recorded

Created `.swimpay-agent/LIMITED_BANK_PACKAGE_DISCOVERY_AUTHORIZATION.md`.

Allowed search keywords only:

- `sber`
- `tinkoff`
- `tbank`
- `vtb`
- `alfa`
- `gazprom`
- `gazprombank`

Forbidden actions were recorded: no full installed-app report, no app internals inspection, no app opening, no notification processing, no SMS, no scraping, no Accessibility usage, no production trust and no auto-confirm.

## Candidate Packages Found

Filtered ADB lookup only, using authorized device `R5CWA0FEPZW`:

| Bank | Candidate package |
|---|---|
| Sberbank | `ru.sberbankmobile` |
| Tinkoff / T-Bank | `com.idamob.tinkoff.android` |
| VTB | `ru.vtb24.mobilebanking.android` |
| Alfa-Bank | `ru.alfabank.mobile.android` |
| Gazprombank | `ru.gazprombank.android.mobilebank.app` |

No unrelated installed packages were included in the report.

## Candidate-to-bank Mapping

| Bank profile | Package | Mapping status |
|---|---|---|
| `sber_ru` | `ru.sberbankmobile` | existing Sprint 4Q/4R evidence |
| `tbank_ru` | `com.idamob.tinkoff.android` | obvious filtered candidate |
| `vtb_ru` | `ru.vtb24.mobilebanking.android` | obvious filtered candidate |
| `alfa_ru` | `ru.alfabank.mobile.android` | obvious filtered candidate |
| `gazprombank_ru` | `ru.gazprombank.android.mobilebank.app` | obvious filtered candidate |

## Evidence Collected

Exact PackageManager evidence was collected for the four remaining V1 banks and submitted to `/v1/bank-evidence`:

| Bank profile | Evidence id | Initial status | Safety flags |
|---|---|---|---|
| `tbank_ru` | `2517df4b-d7ae-4e3c-9ae2-e4697864d7c7` | `pending_operator_review` | `trusted=false`, `auto_confirm_enabled=false` |
| `vtb_ru` | `6508ef0a-aefa-4378-8194-f86a19828fd3` | `pending_operator_review` | `trusted=false`, `auto_confirm_enabled=false` |
| `alfa_ru` | `8d28cbd9-d88e-4ca8-906d-751d05263889` | `pending_operator_review` | `trusted=false`, `auto_confirm_enabled=false` |
| `gazprombank_ru` | `fa54c539-7654-4f5a-b0ec-e0221a752c9a` | `pending_operator_review` | `trusted=false`, `auto_confirm_enabled=false` |

## Review-only Approvals

The four new evidence rows were approved only as `approved_for_review_only`.

No production trust was requested or approved. Database verification showed no `production_trust_requested_at` or `production_trust_approved_at` values for these rows.

## Five-bank Matrix Update

Updated:

- `docs/FIVE_BANK_MVP_VALIDATION_MATRIX.md`
- `packages/bank-templates/v1-bank-mvp-matrix.json`

Current matrix state:

- Sberbank: `production_trust_revoked` evidence from prior local drill, auto-confirm disabled.
- Tinkoff / T-Bank: `approved_for_review_only`, auto-confirm disabled.
- VTB: `approved_for_review_only`, auto-confirm disabled.
- Alfa-Bank: `approved_for_review_only`, auto-confirm disabled.
- Gazprombank: `approved_for_review_only`, auto-confirm disabled.

## Banks Still Missing Package Evidence

None of the selected V1 banks are missing package evidence after Sprint 6B.

Remaining blockers are not package evidence blockers: real bank notification shadow testing has not started and no real notification samples are approved.

## Safety Checks

- No real bank notifications were processed.
- No SMS was read.
- No bank apps were opened.
- No bank app internals were inspected.
- No scraping or Accessibility path was used.
- No full installed-app report was created.
- No customer data was used.
- No raw phone or raw notification text was collected.
- No production trust was requested or approved.
- Auto-confirm remains disabled for all five bank profiles.

## Commands Run

- `npm test -- tests/five-bank-package-evidence-wave.test.ts` - RED before implementation; missing Sprint 6B artifacts and remaining-bank evidence.
- `where adb` - no PATH result.
- checked `C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe` - found.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - services healthy.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` - HTTP 200.
- `adb devices -l` - authorized device `R5CWA0FEPZW`.
- filtered `pm list packages` commands for allowed keywords only - candidate packages found.
- exact `dumpsys package <package>` metadata lookups for selected packages only - PackageManager metadata found.
- `POST /v1/bank-evidence` for four selected packages - evidence accepted as `pending_operator_review`.
- `POST /v1/admin/bank-evidence/:id/approve-review-only` for four rows - evidence approved as `approved_for_review_only`.
- PostgreSQL verification queries for evidence status and `auto_confirm_status` - review-only evidence and disabled auto-confirm confirmed.
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080` - PASS.

Final repository validation:

- `npm run android:doctor` - PASS.
- `npm run typecheck` - PASS.
- `npm run lint` - PASS.
- `npm test` - PASS, 46 files and 316 tests.
- `npm run build` - PASS.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, services healthy.
- `GET http://localhost:8080/api-health` - PASS, HTTP 200.
- Android Gradle validation was not run because Sprint 6B did not touch Android app code.
- `git diff --check` - PASS.

## Blockers

No critical blockers.

Known non-critical limitations:

- Real bank notification shadow testing has not started.
- No real notification samples are stored or approved.
- Package evidence remains review-only and is not production trust.

## Next Recommended Sprint

Sprint 6C - Five-bank review-only receiver selection and synthetic shadow runtime rehearsal.

Recommended scope:

1. Select all five review-only bank profiles in the Receiver.
2. Run synthetic per-bank notification-signal fixtures through the review-only runtime path.
3. Verify review queue and webhook disclosure for each bank.
4. Keep real bank notifications, production trust and auto-confirmation out of scope until a separate approved sprint.
