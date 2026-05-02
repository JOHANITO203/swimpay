# Sprint 4L Report - Bank Package Evidence Dry Run Readiness

generated_at: 2026-05-03T01:36:30+03:00

status: PASS

## Scope

Sprint 4L prepared SwimPay Receiver for a future, controlled bank package/certificate evidence dry run. It did not collect real bank evidence, did not trust real bank packages, and did not process real bank notifications.

## Tasks Created

- `tasks/148_bank_package_evidence_contract.md`
- `tasks/149_android_package_manager_evidence_collector.md`
- `tasks/150_evidence_review_only_guard.md`
- `tasks/151_operator_evidence_diagnostics_no_pii.md`
- `tasks/152_real_device_evidence_dry_run_plan.md`
- `tasks/153_bank_evidence_docs_and_local_flow.md`
- `tasks/154_sprint_4l_closeout_review.md`

## Tasks Completed

- Defined a receiver-side bank package evidence contract.
- Added a PackageManager evidence collector for explicit package-name checks only.
- Added review-only policy guards so observed package/cert evidence cannot create production trust automatically.
- Added PII-safe operator diagnostics for evidence observations.
- Added a documented real-device dry-run checklist.
- Updated Android Receiver, security, local development and bank verification docs.

## Package/Certificate Evidence Behavior

- `TO_VERIFY` and blank package/cert values remain review-only and untrusted.
- Concrete PackageManager observations are marked `operator_review_required`.
- Synthetic debug evidence remains `synthetic_debug_only`, debug-only and not production trust evidence.
- Evidence policy constructs a `ReceiverBankProfileSelection` and enforces that dry-run evidence never returns production-trusted readiness.
- No real bank package names or certificate fingerprints were invented.

## Collector Behavior

- Android `PackageManagerBankPackageEvidenceCollector` checks one explicit package name supplied by the operator/debug flow.
- It does not enumerate installed apps.
- It hashes signing certificate bytes with SHA-256 when Android platform data is available.
- Missing packages fail as collector errors and do not become trust evidence.

## Diagnostics Behavior

- Diagnostics include safe status fields, reason codes and masked certificate summaries.
- Full certificate hashes are shortened as prefix/suffix only.
- Raw phone, raw notification text, secrets and raw notification title/body are not included.

## Real-device Result

- Device serial: `R5CWA0FEPZW`
- Device model: Samsung `SM_S916B`
- Backend health: PASS at `http://localhost:8080/api-health`
- ADB reverse: PASS for `tcp:8080 tcp:8080`
- APK assemble/install/launch: PASS
- No real bank evidence collection was run in this sprint.

## Tests Added

- Android JVM tests for:
  - `TO_VERIFY` evidence remaining review-only.
  - concrete PackageManager evidence requiring operator review.
  - synthetic debug evidence staying non-production trust.
  - masked certificate diagnostics and redacted sensitive text.
- Static repo tests for Sprint 4L task queue/docs and evidence guardrails.

## Commands Run

- `npm run android:doctor` - PASS
- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm test` - PASS, 34 files / 249 tests
- `npm run build` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, all services healthy
- `GET http://localhost:8080/api-health` - PASS, dependencies ok
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace` - PASS
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace` - PASS
- `adb devices -l` - PASS, authorized device detected
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

Non-critical limitation: real bank package/certificate collection still requires a deliberate operator-controlled dry run and human verification workflow.

## Next Recommended Sprint

Sprint 4M - Operator-reviewed bank evidence dry run and verification workflow.

Recommended focus:

1. Add a backend/admin evidence intake endpoint guarded by operator RBAC.
2. Store evidence as pending operator review only.
3. Add audit events for evidence submission and review.
4. Run a synthetic-only operator review path before any real package/cert dry run.
