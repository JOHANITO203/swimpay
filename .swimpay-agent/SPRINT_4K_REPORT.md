# Sprint 4K Report — Receiver Bank Selection Readiness and Resilience

generated_at: 2026-05-03T01:20:17+03:00

status: PASS

## Tasks Created

1. `141_bank_profile_selection_model`
2. `142_receiver_ready_review_only_state`
3. `143_bank_selection_onboarding_ui_debug`
4. `144_listener_resilience_after_app_restart`
5. `145_workmanager_process_death_retry_real_device`
6. `146_operator_diagnostics_export_no_pii`
7. `147_sprint_4k_closeout_review`

## Tasks Completed

All Sprint 4K tasks were completed.

## Bank Profile Selection Behavior

- Added a receiver-side `ReceiverBankProfileSelection` model with:
  - `bank_profile_id`
  - `display_name`
  - `package_name`
  - `package_cert_sha256`
  - `verification_status`
  - `selected`
  - `review_only`
  - `synthetic_debug_only`
- V1 real bank profiles remain `TO_VERIFY` and review-only.
- Selected `TO_VERIFY` banks can enable detection/review-only readiness, but cannot create production trust.
- Synthetic debug bank metadata is explicitly `synthetic_debug_only` and cannot become production trust evidence.
- Unknown bank profile selection is ignored safely.

## Ready Review-only Behavior

- The readiness evaluator now treats synthetic debug profiles as non-production-trusted.
- Listener enabled + backend reachable + registered device + selected `TO_VERIFY` bank reaches `ready_review_only`.
- No selected bank still blocks readiness with `bank_selection_required`.
- Listener disabled still blocks readiness with `notification_access_required`.
- No `ready_auto_confirm` state or Android-side payment confirmation behavior was added.

## Bank Selection UI / Debug Behavior

- The Android status screen now shows selected bank rows with verification status, review-only state and safe warning text.
- Required wording is present:

```text
Cette banque peut être utilisée pour détecter des signaux et les envoyer en review. Elle n’est pas encore vérifiée pour l’auto-confirmation.
```

- The UI continues to say `backend decision pending`, `notification signal`, and `not official bank confirmation`.
- Synthetic debug rows are visible only in debug-mode UI modeling.

## Diagnostics Export

- Added `ReceiverOperatorDiagnosticsExport`.
- Export includes:
  - app version
  - device status
  - Notification Access state
  - app notification permission state
  - listener connected state
  - backend reachability
  - selected bank count
  - selected bank verification statuses
  - outbox pending/retrying counts
  - last upload status
  - last signal observed time
  - last redacted error summary
  - synthetic debug source state
- Export redacts raw phone, raw notification fields, API keys, tokens, passwords and signatures.

## Real-device Listener Restart Result

- Device: `R5CWA0FEPZW`, Samsung `SM_S916B`.
- Backend health: PASS at `http://localhost:8080/api-health`.
- ADB reverse: PASS with `tcp:8080 tcp:8080`.
- APK install: PASS.
- App launch: PASS.
- Notification Listener Access: enabled for `com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService`.
- After `am force-stop` and relaunch, a debug-only synthetic notification was captured by `SwimPayNotificationListenerService`.
- Listener diagnostics observed safe metadata only:
  - synthetic debug package
  - notification id/tag
  - post time
  - `fields_detected=4`
  - `result=enqueued`
- Outbox/backend upload after restart: PASS with `acked=1 failed_retrying=0`.

## WorkManager / Process-death Retry Result

- Simulated backend unavailability by stopping the local Caddy proxy while keeping the app/device path synthetic.
- Manual debug flush while backend was unavailable produced:
  - `acked=0`
  - `failed_retrying=1`
- After restarting the proxy, force-stopping/relaunching the app and flushing the persisted outbox:
  - `acked=1`
  - `failed_retrying=0`
- This validates persisted outbox recovery across app restart.
- Android force-stop prevents autonomous background execution until app relaunch; this is an OS behavior limitation, not a data-path failure.

## Tests Added

- Android JVM tests:
  - `BankProfileSelectionTest`
  - `BankSelectionOnboardingUiTest`
  - new readiness cases in `ReceiverOnboardingReadinessTest`
  - operator diagnostics export test in `ReceiverDiagnosticsTest`
- Node/Vitest static tests:
  - Sprint 4K task queue order in `tests/agent-framework.test.ts`
  - Sprint 4K Android model/static checks in `apps/android-receiver/src/android-runnable-app.test.ts`

## Commands Run

- `npm run android:doctor` — PASS
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm test` — PASS
- `npm run build` — PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` — PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` — PASS
- `GET http://localhost:8080/api-health` — PASS
- `.\gradlew.bat :app:assembleDebug --no-daemon --stacktrace` — PASS
- `.\gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace` — PASS
- `adb devices -l` — PASS
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080` — PASS
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk` — PASS
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity` — PASS
- Debug synthetic notification broadcast — PASS
- Debug outbox offline/online smoke — PASS

## Safety

- No real bank notification used.
- No real customer data used.
- No SMS permission, SMS reading or bank scraping added.
- No Accessibility scraping service added.
- Android does not confirm or auto-confirm payments.
- Raw phone and raw notification text are not stored/uploaded by the new paths.
- No official bank confirmation claim was introduced.
- `TO_VERIFY` and synthetic debug package/cert metadata remain untrusted for production decisions.

## Blockers

No critical blocker.

Non-critical:

- Global `gradle` is still not available in PATH; trusted wrapper works.
- Emulator remains unavailable.
- Full autonomous WorkManager behavior after Android force-stop/reboot remains a future real-device validation item.
- Real bank package/cert verification and real bank notifications remain out of scope.

## Next Recommended Sprint

Sprint 4L — Bank Package/Certificate Evidence Dry Run Preparation.

Recommended focus:

1. Define a human/operator dry-run checklist for collecting real Android PackageManager package/cert evidence without trusting it automatically.
2. Add backend/operator review workflow for captured evidence.
3. Keep all real bank profiles review-only until explicit verification.
4. Continue real-device reboot/background WorkManager validation with synthetic redacted data.
