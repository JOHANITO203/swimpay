# Sprint 7I Sberbank Shadow Report

status: preflight_passed_waiting_for_explicit_live_capture_consent
generated_at: 2026-05-04T23:58:46+03:00

## Scope

Sprint 7I is scoped to the first controlled real-notification shadow test for Sberbank only:

- bank profile: `sber_ru`
- package: `ru.sberbankmobile`
- one small controlled incoming-payment notification only
- review-first only
- no auto-confirmation
- no production trust change
- no raw notification storage
- no SMS
- no Accessibility scraping
- no bank app scraping
- no broad app enumeration

## Preflight Result

Preflight passed for environment, backend, Android build and real-device reachability.

Passed:

- Frontend browser QA prerequisite exists and passed.
- Sprint 7F backend/mobile validation prerequisite exists and passed after revalidation.
- `.swimpay-agent/BLOCKERS.md` had no current critical blocker at sprint start.
- Docker Desktop initially failed, then started successfully.
- Compose services are healthy.
- `GET http://localhost:8080/api-health` returned database, NATS and Valkey as `ok`.
- `npm run android:doctor` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 54 files / 382 tests.
- `npm run build` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` passed.
- Android `:app:assembleDebug` passed.
- Android `:app:testDebugUnitTest` passed.
- ADB detected authorized device `R5CWA0FEPZW`.
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080` succeeded.
- Debug APK install succeeded.
- Receiver app launch succeeded.
- Notification Listener Access includes `com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService`.
- Exact package lookup found `ru.sberbankmobile` without installed-app enumeration.
- Static Android manifest/source check found no `READ_SMS`, `RECEIVE_SMS`, `BIND_ACCESSIBILITY_SERVICE`, `AccessibilityService` or `QUERY_ALL_PACKAGES` in the inspected main/debug manifest and main Java source scope.

## Consent and Flags

Created `.swimpay-agent/SBERBANK_SHADOW_CONSENT.md`.

Consent state: `pending_explicit_operator_confirmation`.

The sprint prompt describes the consent gate, but this session has not yet included a direct operator phrase explicitly authorizing live capture now. Therefore no real notification capture was started.

Safe flag/config state:

- Sberbank bank profile: `auto_confirm_status=disabled`.
- Contract defaults:
  - `SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED=false` when unset.
  - `SWIMPAY_REQUIRE_REAL_NOTIFICATION_CONSENT=true` when unset.
  - `SWIMPAY_REAL_BANK_AUTO_CONFIRM=false` when unset.
  - `SWIMPAY_RAW_NOTIFICATION_STORAGE=false` when unset.
- `.env.example` does not override those flags.
- No production trust mutation was performed.

## Sberbank Evidence Status

Safe backend query, without full certificate hash:

- `sber_ru` profile exists.
- `ru.sberbankmobile` package evidence exists.
- Latest local evidence row: `878ddd87-2e69-40b1-9cc7-da15d95a6b0b`.
- Latest evidence status: `production_trust_revoked`.
- Production trust request/approval/revocation timestamps exist from prior local drill.
- Bank profile auto-confirm remains `disabled`.

Note: this is safe for review-first/no-auto-confirm operation, but it is not literally `approved_for_review_only`. Treat this as a preflight warning before live capture.

## Notification Capture

Result: not captured.

Reason:

- Explicit live-capture consent phrase is still pending.

No real Sberbank notification was captured, read, uploaded, logged, parsed or matched.

## Redaction Result

Not executed because no notification was captured.

No raw notification title/body/text was stored or uploaded.

## Parser and Matching Result

Not executed because no redacted real notification signal was available.

No order/session matching mutation was performed.

## Review Result

Not executed.

No review row was created from a real Sberbank notification.

## Webhook Result

Not executed.

No manual confirmation was performed and no webhook was emitted.

## Commands Run

- `Get-Content -Raw AGENTS.md`
- `Get-Content -Raw .swimpay-agent/FRONTEND_BROWSER_QA_REPORT.md`
- `Get-Content -Raw .swimpay-agent/SPRINT_7F_REPORT.md`
- `Get-Content -Raw .swimpay-agent/BLOCKERS.md`
- `Get-Content -Raw .swimpay-agent/NEXT_ACTION.md`
- `docker version` - failed initially, then passed after starting Docker Desktop.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - passed after Docker start; services healthy.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` - failed initially, then passed after Docker start.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - passed.
- `npm run android:doctor` - passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm test` - passed, 54 files / 382 tests.
- `npm run build` - passed.
- Android `:app:assembleDebug` - passed.
- Android `:app:testDebugUnitTest` - passed.
- `adb devices -l` via local SDK adb - passed; `R5CWA0FEPZW` visible and authorized.
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080` - passed.
- `adb -s R5CWA0FEPZW install -r ...app-debug.apk` - passed.
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity` - passed.
- `adb -s R5CWA0FEPZW shell settings get secure enabled_notification_listeners` - passed; SwimPay listener is enabled.
- `adb -s R5CWA0FEPZW shell pm path ru.sberbankmobile` - passed; exact package found.
- `adb -s R5CWA0FEPZW exec-out uiautomator dump /dev/tty` - passed for SwimPay UI tree.
- Safe PostgreSQL checks for Sberbank evidence and bank profile state - passed.

## Blockers

Critical before live capture:

1. Explicit live-capture operator consent is still pending.

Preflight warning:

- Latest Sberbank local evidence status is `production_trust_revoked`, not literal `approved_for_review_only`. This remains safe from an auto-confirm perspective because Sberbank `auto_confirm_status=disabled`, but should be acknowledged before live capture.

## Next Recommendation

Continue Sprint 7I in the same scope:

1. Operator sends explicit consent phrase for the single controlled Sberbank shadow test.
2. Re-check backend health and ADB device visibility.
3. Trigger exactly one controlled Sberbank incoming notification.
4. Verify redaction, review-first matching and manual-review webhook disclosure.
