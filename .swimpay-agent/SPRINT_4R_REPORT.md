# Sprint 4R Report - Android Package Visibility and Operator Evidence UX Hardening

generated_at: 2026-05-03T11:54:16+03:00
status: PASS

## Tasks Created

- `189_android_package_visibility_policy`
- `190_manifest_queries_for_operator_selected_packages`
- `191_package_not_visible_vs_not_found`
- `192_operator_evidence_ux_status_messages`
- `193_package_visibility_real_device_retest`
- `194_evidence_visibility_safety_tests`
- `195_sprint_4r_closeout_review`

## Tasks Completed

All Sprint 4R tasks completed.

## Package Visibility Policy

Android package visibility is now documented as a separate constraint from package absence. Evidence lookup remains one explicit operator-selected package at a time.

Forbidden paths remain forbidden:

- no installed-app enumeration;
- no `QUERY_ALL_PACKAGES`;
- no app scraping;
- no SMS access;
- no notification processing for evidence collection.

## Manifest Query Changes

The debug/operator Android manifest now includes one exact package visibility query:

```xml
<package android:name="ru.sberbankmobile" />
```

This is debug/operator dry-run support only. It is not production trust, not auto-confirmation readiness and not notification processing.

The main manifest does not include this package query.

## Lookup Semantics

App-side explicit package evidence lookup now supports:

- `FOUND`
- `PACKAGE_NOT_FOUND`
- `PACKAGE_NOT_VISIBLE_OR_NOT_DECLARED`
- `INVALID_PACKAGE_NAME`

Android `PackageManager.NameNotFoundException` is surfaced as `PACKAGE_NOT_VISIBLE_OR_NOT_DECLARED` because Android can hide installed packages that are not visible to the app.

## UX / Operator Messages

Added safe operator wording:

- `Package not visible to the app. Add explicit package visibility or use operator ADB dry-run.`
- `Evidence remains pending operator review.`
- `Not trusted yet.`
- `Auto-confirm remains disabled.`

No official bank confirmation wording was introduced.

## Real-device Retest Result

- Device: `R5CWA0FEPZW` / Samsung `SM_S916B`
- Backend health: PASS at `http://localhost:8080/api-health`
- ADB reverse: PASS, `tcp:8080 tcp:8080`
- APK build/install/launch: PASS
- App-side explicit lookup/submission for `ru.sberbankmobile`: PASS
- Debug log result: `explicit package evidence submitted for operator review; not trusted yet; no auto-confirm enabled`

## Evidence Submission Result

New app-side evidence row:

- evidence_id: `878ddd87-2e69-40b1-9cc7-da15d95a6b0b`
- package_name: `ru.sberbankmobile`
- cert hash display: `fea43e...99a2ea`
- status: `pending_operator_review`
- trusted: `false`
- production_trusted_app_metadata: `false`
- auto_confirm_enabled: `false`

No production trust was requested or approved in this sprint.

## Safety Checks

PASS:

- no `QUERY_ALL_PACKAGES`;
- no installed-app enumeration APIs;
- no SMS permission;
- no Accessibility scraping service;
- no notification processing;
- no raw phone;
- no raw notification text;
- no Android payment confirmation;
- no Android auto-confirmation;
- package visibility does not imply trust;
- review-only remains separate from production trust.

## Commands Run

- `npm test -- apps/android-receiver/src/android-runnable-app.test.ts` - PASS
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` - PASS after limiting Android test forks to one JVM
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` - PASS
- `adb devices -l` - PASS, authorized device found
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1` - PASS
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080` - PASS
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk` - PASS
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity` - PASS
- `adb ... --es action register_receiver` - PASS
- `adb ... --es action submit_explicit_package_evidence --es package_name ru.sberbankmobile --es bank_profile_id sber_ru` - PASS
- `GET /v1/admin/bank-evidence` - PASS, new row pending operator review

Full repository validation was run after closeout updates.

## Blockers

No critical blockers.

Known non-critical limitations:

- package visibility is currently debug/operator exact-query support, not a production package visibility policy;
- production trust remains a separate dual-control workflow;
- real bank notifications remain out of scope.

## Next Recommended Sprint

Sprint 4S - Operator review UX and evidence lifecycle hardening:

- make pending evidence review status easier for operators to inspect;
- add lifecycle cleanup/deprecation guidance for repeated package evidence rows;
- keep production trust separate and dual-control;
- do not process real bank notifications until a separate approved sprint.
