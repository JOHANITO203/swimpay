# Sprint 6A Report - Five-bank MVP Validation Matrix and Private Beta Readiness

status: PASS
generated_at: 2026-05-03T15:05:00+03:00

## Scope

Sprint 6A stops the production/admin hardening chain and creates the five-bank MVP validation foundation for private beta readiness.

No real bank notifications were processed. No production trust was requested or approved. No installed-app enumeration was performed. Auto-confirmation remains disabled for real banks.

## Tasks Created

1. `273_phase_6_five_bank_mvp_direction`
2. `274_five_bank_mvp_validation_matrix`
3. `275_five_bank_package_evidence_collection_plan`
4. `276_five_bank_receiver_selection_and_readiness`
5. `277_five_bank_redacted_notification_shadow_policy`
6. `278_five_bank_review_only_runtime_tests`
7. `279_beta_merchant_onboarding_flow`
8. `280_private_beta_go_no_go_checklist`
9. `281_sprint_6a_closeout_review`

## Tasks Completed

All Sprint 6A tasks are completed.

## Matrix Status

The five-bank matrix covers:

- `sber_ru` - Sberbank
- `tbank_ru` - Tinkoff / T-Bank
- `vtb_ru` - VTB
- `alfa_ru` - Alfa-Bank
- `gazprombank_ru` - Gazprombank

Sberbank is prefilled with operator-selected package `ru.sberbankmobile`; its current evidence baseline is review-only / production-trust-revoked from local drills, with auto-confirm disabled.

All other banks remain `package_input_needed`; no package names or certificate fingerprints were invented.

## Package Evidence Plan

Each bank requires one explicit operator package-name input before evidence collection. The plan forbids installed-app enumeration, guessing, app internals inspection, notification processing and SMS access.

## Receiver Selection Readiness

Selected review-only or `TO_VERIFY` banks can only produce `ready_review_only`. No selected bank blocks readiness. Auto-confirm readiness is not created by package evidence or bank selection.

## Shadow Policy

The first real bank notification tests must be explicit, consented, redacted and review-only/shadow-first. No raw notification text storage by default. Negative categories and amount-only signals never auto-confirm.

## Review-only Runtime Tests

Synthetic redacted runtime coverage verifies all five bank profile ids route incoming-like untrusted/review-only signals to review, with safe webhook disclosure and no auto-confirm.

## Beta Onboarding

The merchant onboarding flow covers Receiver install, Notification Listener Access, bank selection, device registration, synthetic signal test, test order, review and webhook/fulfillment test.

## Private Beta Go/no-go

`docs/PRIVATE_BETA_READINESS.md` defines go/no-go criteria for backend health, Android install, Notification Access, package evidence, review queue, webhook delivery, outbox behavior, privacy, RBAC and no auto-confirm on real banks.

## Commands Run

- `npm test -- tests/five-bank-mvp-readiness.test.ts apps/signal-worker/src/runtime.test.ts` - RED first because Phase 6 artifacts were missing, then PASS after implementation.
- `npm test -- tests/five-bank-mvp-readiness.test.ts apps/signal-worker/src/runtime.test.ts tests/agent-framework.test.ts` - PASS, 27 tests.
- `npm run android:doctor` - PASS.
- `npm run typecheck` - PASS.
- `npm run lint` - failed once on an unused test parameter, then PASS after fixing the test.
- `npm test -- tests/production-admin-auth-preflight.test.ts tests/five-bank-mvp-readiness.test.ts tests/agent-framework.test.ts` - PASS, 12 tests.
- `npm test` - failed once because a Sprint 5B test expected the active queue to remain Sprint 5B, then PASS after changing that test to check Sprint 5B artifacts instead of active queue order; final run: 45 files and 313 tests.
- `npm run build` - PASS.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, services healthy.
- `GET http://localhost:8080/api-health` - PASS, HTTP 200.
- Android Gradle validation was not run because Sprint 6A did not touch Android platform code.

## Blockers

No critical blockers.

Known non-critical limitations:

- Only Sberbank has real package evidence (`ru.sberbankmobile`).
- Tinkoff / T-Bank, VTB, Alfa-Bank and Gazprombank still need explicit package-name input.
- No real bank notification shadow run has been approved or executed.
- Auto-confirm remains disabled for real banks.

## Next Recommended Sprint

Sprint 6B - Five-bank Package Evidence Collection Wave.

Recommended scope:

1. Collect explicit operator package-name input for Tinkoff / T-Bank, VTB, Alfa-Bank and Gazprombank.
2. Run one-package PackageManager evidence dry runs only for explicitly provided packages.
3. Submit evidence as `pending_operator_review`.
4. Approve evidence only as `approved_for_review_only`.
5. Keep real bank notifications and auto-confirmation out of scope.
