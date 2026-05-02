# Sprint 4M Report - Operator-reviewed Bank Evidence Workflow

generated_at: 2026-05-03T02:00:46+03:00

status: PASS

## Tasks Created

- `tasks/155_bank_evidence_backend_schema.md`
- `tasks/156_bank_evidence_intake_endpoint.md`
- `tasks/157_bank_evidence_admin_review_api.md`
- `tasks/158_bank_evidence_audit_events.md`
- `tasks/159_bank_evidence_receiver_submit_flow.md`
- `tasks/160_bank_evidence_operator_review_tests.md`
- `tasks/161_sprint_4m_closeout_review.md`

## Tasks Completed

- Added `bank_package_evidence` migration.
- Added backend evidence repository and validation.
- Added `POST /v1/bank-evidence` receiver intake endpoint.
- Added RBAC-protected admin evidence list/detail/review endpoints.
- Added evidence audit events.
- Added Android debug-only synthetic evidence submission action.
- Added backend, Android JVM and static tests.
- Updated docs and local development notes.

## Evidence Schema Behavior

Evidence is stored with safe metadata only:

- merchant/device/bank profile ids;
- package name;
- cert SHA-256;
- app version;
- install source;
- source;
- status;
- review metadata.

Allowed statuses:

- `pending_operator_review`
- `approved_for_review_only`
- `rejected`
- `deprecated`

No `trusted` evidence status was added.

## Intake Endpoint Behavior

`POST /v1/bank-evidence`:

- requires local merchant/receiver auth foundation;
- validates registered receiver device and known bank profile;
- requires concrete package/cert or synthetic debug fixture values;
- rejects `TO_VERIFY` evidence submission;
- stores evidence as `pending_operator_review`;
- returns `trusted: false` and `auto_confirm_enabled: false`.

## Admin Review Behavior

Admin endpoints:

- `GET /v1/admin/bank-evidence`
- `GET /v1/admin/bank-evidence/:id`
- `POST /v1/admin/bank-evidence/:id/approve-review-only`
- `POST /v1/admin/bank-evidence/:id/reject`

RBAC:

- view requires `view_bank_templates`;
- approve-review-only requires `promote_bank_templates`;
- reject requires the dangerous action boundary used for degradation.

Approval sets only `approved_for_review_only`. It does not mark bank app signatures verified, does not make bank profiles trusted and does not enable auto-confirm.

## Audit Behavior

Audit events:

- `bank_evidence.submitted`
- `bank_evidence.reviewed`
- `bank_evidence.approved_review_only`
- `bank_evidence.rejected`

Payloads include masked cert hashes and redacted operator reasons only.

## Receiver Submit Behavior

The Android debug smoke controller now exposes:

```text
submit_synthetic_bank_evidence
```

It submits synthetic debug evidence through `/v1/bank-evidence` and shows safe wording:

- evidence submitted for operator review;
- not trusted yet;
- no auto-confirm enabled.

The action is debug-only, synthetic-only and does not enumerate installed apps.

## Tests Added

- Backend API tests for evidence submission, duplicate handling, listing/detail, approval, rejection, RBAC and audit.
- Android JVM test for debug synthetic evidence submission.
- Static tests for Sprint 4M task order and workflow guardrails.

## Commands Run

- `npm run android:doctor` - PASS
- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm test` - PASS, 35 files, 257 tests
- `npm run build` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, all Compose services healthy
- `GET http://localhost:8080/api-health` - PASS, HTTP 200
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1` - PASS
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` - PASS
- `adb devices -l` - PASS, real device `R5CWA0FEPZW` authorized
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080` - PASS
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk` - PASS
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity` - PASS

## Safety

- No real bank notification used.
- No real customer data used.
- No SMS reading.
- No bank app scraping.
- No Accessibility scraping.
- No Android payment confirmation.
- No Android auto-confirmation.
- No raw phone stored/uploaded.
- No raw notification text stored/uploaded.
- No official bank confirmation claim.
- `TO_VERIFY` and `synthetic_debug_only` metadata remain untrusted for production decisions.

## Blockers

No critical blockers.

Non-critical limitation: real bank package/cert evidence still requires an explicit operator-run dry run and human review policy outside automated tests.

## Next Recommended Sprint

Sprint 4N - Real-device operator evidence dry-run rehearsal with synthetic package only.

Recommended focus:

1. Run the app-side evidence submission through real device debug controls.
2. Verify admin review endpoint against local Compose backend.
3. Keep all results review-only.
4. Continue avoiding real bank notifications and real customer data.
