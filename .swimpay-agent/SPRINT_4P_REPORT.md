# Sprint 4P Report - Operator-controlled Real Bank Package Evidence Dry-run Planning

generated_at: 2026-05-03T11:20:00+03:00

status: PASS

## Tasks Created

- `tasks/176_real_bank_package_input_policy.md`
- `tasks/177_android_explicit_package_evidence_lookup.md`
- `tasks/178_real_bank_evidence_submit_dry_run.md`
- `tasks/179_admin_real_evidence_review_only_dry_run.md`
- `tasks/180_evidence_collection_privacy_and_safety_checks.md`
- `tasks/181_real_bank_evidence_dry_run_runbook.md`
- `tasks/182_sprint_4p_closeout_review.md`

## Tasks Completed

- Added a strict real package input policy requiring one explicit operator/user package name.
- Hardened Android PackageManager evidence lookup with safe `package_not_found` behavior.
- Added debug/operator action `submit_explicit_package_evidence`.
- Kept evidence submission review-only through `/v1/bank-evidence`.
- Documented admin review-only behavior for any future real evidence.
- Added privacy/safety tests and static checks.
- Created `docs/REAL_BANK_EVIDENCE_DRY_RUN_RUNBOOK.md`.

## Package-name Input Policy

The real dry-run path accepts only one explicit `package_name`.

Rejected:

- blank package names;
- wildcard/enumeration-like values;
- whitespace-separated values;
- `TO_VERIFY`;
- `synthetic_debug_only` for real evidence.

SwimPay must not guess or invent real bank package names. Operator/manual knowledge may provide a package name, but Android must verify it through PackageManager before evidence submission.

## PackageManager Lookup Behavior

Android now exposes `lookupExplicitPackageEvidence(...)` for one exact package.

Possible results:

- `FOUND`
- `PACKAGE_NOT_FOUND`
- `INVALID_PACKAGE_NAME`

If the package is not found, no evidence is submitted and no trust evidence is created.

The code does not use installed-app enumeration APIs.

## Evidence Submit Behavior

Debug/operator action:

```text
submit_explicit_package_evidence
```

Expected inputs:

- `package_name`
- optional `bank_profile_id`

Submitted evidence remains:

- `pending_operator_review`
- `trusted: false`
- `auto_confirm_enabled: false`

No real evidence was submitted during this sprint because no explicit real package name was provided.

## Admin Review-only Behavior

Any future real evidence uses the existing admin review-only flow:

- list/detail;
- approve-review-only;
- reject.

Sprint 4P does not request or approve production trust for real evidence. Production trust remains separate and dual-control protected.

## Safety Checks

Tests and static checks cover:

- explicit package input only;
- package-not-found no-op;
- no installed-app enumeration;
- no SMS;
- no Accessibility scraping;
- no raw phone;
- no raw notification text;
- no auto-confirm enablement;
- no automatic bank trust.

## Live Real Evidence Collection

Not collected.

Reason: no real package name was provided by the operator/user. Sprint 4P intentionally completed mechanism, tests and docs only.

## Commands Run

Initial red checks:

- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` - failed as expected before implementation because the new policy/action interfaces did not exist.
- `npm test -- apps/android-receiver/src/android-runnable-app.test.ts` - failed as expected before implementation because the new 4P static wiring did not exist.

Green targeted checks:

- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` - PASS after implementation.
- `npm test -- apps/android-receiver/src/android-runnable-app.test.ts` - PASS after implementation.

Full validation results are recorded in the final response and progress log.

Final validation:

- `npm run android:doctor` - PASS.
- `npm run typecheck` - PASS.
- `npm run lint` - PASS.
- `npm test` - PASS, 35 test files and 265 tests.
- `npm run build` - PASS.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, services healthy.
- `GET http://localhost:8080/api-health` - PASS with database, NATS and Valkey reported `ok`.
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1` - PASS.
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` - PASS.

## Blockers

No critical blockers.

Non-critical: live real evidence collection is waiting for explicit operator/user package-name input.

## Next Recommended Sprint

Sprint 4Q - Operator-assisted live real package evidence collection, only after a package name is explicitly provided.

Recommended boundaries:

1. Use one operator-provided package name.
2. Do not process notifications.
3. Keep evidence `pending_operator_review` or `approved_for_review_only`.
4. Do not request production trust unless a separate dual-control ceremony is intentionally performed.
