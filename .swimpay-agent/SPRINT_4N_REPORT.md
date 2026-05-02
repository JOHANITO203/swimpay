# Sprint 4N Report - Synthetic Evidence Operator Review Rehearsal

generated_at: 2026-05-03T02:13:21+03:00

status: PASS

## Tasks Created

- `tasks/162_synthetic_evidence_real_device_submission.md`
- `tasks/163_admin_evidence_review_local_flow.md`
- `tasks/164_evidence_review_only_assertions.md`
- `tasks/165_evidence_audit_trace_validation.md`
- `tasks/166_evidence_rejection_rehearsal.md`
- `tasks/167_evidence_workflow_operator_runbook.md`
- `tasks/168_sprint_4n_closeout_review.md`

## Tasks Completed

- Rebuilt local Compose API/web images so Sprint 4M endpoints were active in the live backend.
- Applied additive migration `004_bank_package_evidence.sql` to the existing local Postgres volume.
- Ran Android real-device debug action `submit_synthetic_bank_evidence`.
- Validated admin list/detail, approval and rejection paths.
- Validated review-only assertions and audit trace.
- Added `docs/BANK_EVIDENCE_OPERATOR_RUNBOOK.md`.
- Updated agent reports and task queue.

## Real-device Synthetic Evidence Submission Result

- Device serial: `R5CWA0FEPZW`
- Device model: Samsung `SM_S916B`
- Backend health: PASS at `http://localhost:8080/api-health`
- ADB reverse: `tcp:8080 tcp:8080` PASS
- APK install: PASS
- App launch: PASS
- Debug broadcast action: `submit_synthetic_bank_evidence` PASS
- Android log result: `evidence submitted for operator review; not trusted yet; review-only until approved; no auto-confirm enabled`
- Submitted evidence id: `1a9d9a24-c100-4a4c-8aba-d5e97373fb9b`
- Package/cert class: `synthetic_debug_only`

No real bank package/cert, real bank notification, real customer data or installed-app enumeration was used.

## Admin Evidence Review Result

Admin API was exercised through local Compose proxy:

- `GET /v1/admin/bank-evidence` - PASS
- `GET /v1/admin/bank-evidence/1a9d9a24-c100-4a4c-8aba-d5e97373fb9b` - PASS
- unauthenticated approve attempt - PASS, rejected with HTTP 401
- `POST /v1/admin/bank-evidence/1a9d9a24-c100-4a4c-8aba-d5e97373fb9b/approve-review-only` - PASS

RBAC read-only behavior remains covered by `apps/api/src/bank-evidence.test.ts`; the live Compose dev-token is configured as admin for local operator actions.

## Review-only Assertions

Approved evidence stayed:

- status: `approved_for_review_only`
- `trusted: false`
- `auto_confirm_enabled: false`

The Sberbank profile remained:

- status: `learning`
- auto-confirm status: `disabled`

`TO_VERIFY` and `synthetic_debug_only` remain untrusted for production decisions.

## Audit Trace Result

Audit query:

```text
GET /v1/admin/audit-events?object_type=bank_package_evidence
```

Observed redacted events:

- `bank_evidence.submitted`
- `bank_evidence.reviewed`
- `bank_evidence.approved_review_only`
- `bank_evidence.rejected`

Audit payloads used `cert_sha256_masked: synthetic_debug_only`, `trusted: false` and `auto_confirm_enabled: false`. No raw phone, raw notification text, secrets or API keys were exposed.

## Rejection Rehearsal Result

Second synthetic fixture:

- evidence id: `c09d4c00-b75b-4397-bf47-29dbd4979852`
- package: `synthetic_debug_only.com.swimpay.syntheticbank.reject.3dbf9c10`
- cert display: `synthetic_debug_only`

Result:

- submission: PASS, `pending_operator_review`
- rejection: PASS, `rejected`
- rejection reason stored: `synthetic rejection rehearsal; no production trust`
- `trusted: false`
- `auto_confirm_enabled: false`
- audit event `bank_evidence.rejected`: PASS

## Runbook

Created:

- `docs/BANK_EVIDENCE_OPERATOR_RUNBOOK.md`

It documents:

- synthetic dry-run flow;
- future real package/cert dry-run flow;
- operator review steps;
- `approve-review-only` meaning;
- rejection reasons;
- audit expectations;
- no auto trust;
- no auto-confirm;
- no real notification processing during evidence review;
- human/operator verification required for production trust.

## Commands Run

- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --build swimpay-api proxy` - PASS
- Applied `packages/database/migrations/004_bank_package_evidence.sql` to local Postgres - PASS
- `GET http://localhost:8080/api-health` - PASS
- `GET /v1/admin/bank-evidence` - PASS
- `GET /v1/admin/bank-evidence/:id` - PASS
- `POST /v1/admin/bank-evidence/:id/approve-review-only` - PASS
- `POST /v1/admin/bank-evidence/:id/reject` - PASS
- `GET /v1/admin/audit-events?object_type=bank_package_evidence` - PASS
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1` - PASS
- `adb devices -l` - PASS
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080` - PASS
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk` - PASS
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity` - PASS
- `adb -s R5CWA0FEPZW shell am broadcast ... register_receiver` - PASS
- `adb -s R5CWA0FEPZW shell am broadcast ... submit_synthetic_bank_evidence` - PASS
- `npm run android:doctor` - PASS
- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm test` - PASS, 35 files / 258 tests
- `npm run build` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, all services healthy
- `GET http://localhost:8080/api-health` - PASS, HTTP 200
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1` - PASS
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` - PASS
- Final `adb devices -l`, reverse, install and launch - PASS

Android validation note: an earlier Gradle daemon run crashed with a JVM out-of-memory error while using `-Xmx1536m` alongside Docker. The Android Gradle config was stabilized to `-Xmx768m`, `MaxMetaspaceSize=256m` and one worker; the following fresh assemble and JVM test runs passed.

## Safety

- No real bank notification used.
- No real bank package/cert used.
- No real customer data used.
- No installed-app enumeration.
- No SMS reading.
- No bank app scraping.
- No Accessibility scraping.
- No Android payment confirmation.
- No Android auto-confirmation.
- No raw phone stored/uploaded.
- No raw notification text stored/uploaded.
- No official bank confirmation claim.
- Approval did not create production trust.

## Blockers

No critical blockers.

Non-critical limitation: production bank trust remains a future human/operator policy and must not be inferred from this synthetic dry run.

## Next Recommended Sprint

Sprint 4O - Production trust policy design for bank package/certificate evidence.

Recommended focus:

1. Define multi-step human verification policy for real package/cert evidence.
2. Keep production trust separate from `approved_for_review_only`.
3. Add explicit operator role/permission for any future production trust transition.
4. Continue avoiding real notifications until the policy is approved.
