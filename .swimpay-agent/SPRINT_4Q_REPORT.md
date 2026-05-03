# Sprint 4Q Report - Operator-assisted Live Real Package Evidence Collection

generated_at: 2026-05-03T11:35:33+03:00

status: PASS

## Package Input

Operator-selected package:

```text
ru.sberbankmobile
```

Input validation:

- exact package-like string;
- no wildcard;
- no multi-value input;
- not `TO_VERIFY`;
- not `synthetic_debug_only`.

## Tasks Created

- `tasks/183_operator_package_evidence_input_record.md`
- `tasks/184_real_package_manager_lookup_one_package.md`
- `tasks/185_real_package_evidence_submit_to_backend.md`
- `tasks/186_real_package_admin_review_only.md`
- `tasks/187_real_package_evidence_safety_assertions.md`
- `tasks/188_sprint_4q_closeout_review.md`

## Tasks Completed

- Recorded the operator package input in `.swimpay-agent/REAL_PACKAGE_EVIDENCE_INPUT.md`.
- Verified backend health and real device ADB readiness.
- Built, installed and launched the Android debug APK.
- Triggered app-side explicit package evidence action for `ru.sberbankmobile`.
- Collected exact ADB PackageManager metadata for `ru.sberbankmobile` after app-side lookup returned `package_not_found`.
- Submitted the evidence to the local backend.
- Approved the evidence as review-only.
- Verified redacted audit events and no trust/auto-confirm state.

## PackageManager Lookup Result

App-side debug action:

```text
submit_explicit_package_evidence(package_name=ru.sberbankmobile)
```

Result:

```text
package_not_found; no trust evidence created
```

The exact ADB PackageManager lookup for the same operator-selected package found:

- package: `ru.sberbankmobile`
- app version: `17.5.0`
- install source: `com.sec.android.app.samsungapps`
- certificate SHA-256 masked: `fea43e...99a2ea`

Non-critical limitation: current Android app package visibility prevents the app-side PackageManager collector from seeing this package. No installed-app enumeration was used.

## Evidence Submission Result

Evidence was submitted to:

```text
POST /v1/bank-evidence
```

Evidence id:

```text
f4069615-028b-4329-a136-115495bd058c
```

Initial response:

- `status: pending_operator_review`
- `trusted: false`
- `auto_confirm_enabled: false`
- `next_action: operator_review_required`
- masked cert: `fea43e...99a2ea`

No phone data, notification text, customer data or app-internal data was submitted.

## Admin Review-only Result

Admin endpoints verified:

- `GET /v1/admin/bank-evidence`
- `GET /v1/admin/bank-evidence/f4069615-028b-4329-a136-115495bd058c`
- `POST /v1/admin/bank-evidence/f4069615-028b-4329-a136-115495bd058c/approve-review-only`

Final evidence state:

- `status: approved_for_review_only`
- `trusted: false`
- `production_trusted_app_metadata: false`
- `auto_confirm_enabled: false`
- reviewed by: `dev_operator`

Production trust was not requested or approved.

## Safety Assertions

Verified:

- no real bank notification processing occurred;
- no SMS access;
- no bank app scraping;
- no installed-app enumeration;
- no app data inspection;
- no production trust;
- no auto-confirm enabled;
- `sber_ru` bank profile remained `learning`;
- `bank_app_signatures` did not gain a production-trusted real package signature;
- audit payloads used masked certificate hash only;
- no raw phone, raw notification text, secrets or API keys appeared in evidence/audit responses.

## Commands Run

- `npm run android:doctor` - PASS.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, services healthy.
- `GET http://localhost:8080/api-health` - PASS with database, NATS and Valkey `ok`.
- `adb devices -l` - PASS, authorized device `R5CWA0FEPZW`.
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080` - PASS.
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1` - PASS.
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` - PASS.
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk` - PASS.
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity` - PASS.
- `adb -s R5CWA0FEPZW shell am broadcast ... --es action register_receiver` - PASS.
- `adb -s R5CWA0FEPZW shell am broadcast ... --es action submit_explicit_package_evidence --es package_name ru.sberbankmobile --es bank_profile_id sber_ru` - returned `package_not_found`.
- `adb -s R5CWA0FEPZW shell pm path ru.sberbankmobile` - PASS, exact package found.
- `adb -s R5CWA0FEPZW shell dumpsys package ru.sberbankmobile` with filtered output - PASS, exact metadata only.
- `POST /v1/bank-evidence` - PASS, evidence stored.
- `GET /v1/admin/bank-evidence` - PASS.
- `GET /v1/admin/bank-evidence/:id` - PASS.
- `POST /v1/admin/bank-evidence/:id/approve-review-only` - PASS.
- `GET /v1/admin/audit-events?object_type=bank_package_evidence` - PASS.
- Postgres verification for `bank_profiles` and `bank_app_signatures` - PASS.

- `npm run typecheck` - PASS.
- `npm run lint` - PASS.
- `npm test` - PASS after restoring the completed Sprint 4P history entries in `.swimpay-agent/TASK_QUEUE.md`; final run: 35 files and 265 tests passed.
- `npm run build` - PASS.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, services healthy.
- `GET http://localhost:8080/api-health` - PASS with database, NATS and Valkey `ok`.

## Blockers

No critical blockers.

Non-critical limitation:

- App-side PackageManager lookup cannot currently see `ru.sberbankmobile` under Android package visibility rules. The dry run used exact ADB PackageManager metadata, not installed-app enumeration.

## Next Recommended Sprint

Sprint 4R - Android package visibility and operator evidence UX hardening.

Focus:

- model `package_not_visible` separately from `package_not_found`;
- decide whether debug/operator builds need explicit package visibility declarations for selected package dry runs;
- keep real package names review-only until production trust dual-control is intentionally performed;
- do not process real notifications yet.
