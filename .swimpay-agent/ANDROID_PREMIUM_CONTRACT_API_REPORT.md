# Android Premium Contract/API Report

generated_at: 2026-05-04T18:36:52+03:00

status: code_validated_backend_live_blocked_by_local_docker

## Scope

This report summarizes the latest Android merchant premium contract/API work after the UI refactor discussion.

The work focused on connecting the premium Android merchant UI to typed backend contracts without changing SwimPay payment decision logic.

No new product behavior was added.

## Non-negotiable Safety Boundaries

Kept unchanged:

- SwimPay remains a Payment Signal Engine.
- SwimPay is not a PSP.
- SwimPay is not a bank.
- SwimPay does not provide official bank confirmation.
- Android does not decide payment confirmation.
- Android does not auto-confirm payments.
- Android does not send developer webhooks directly.
- Backend remains responsible for review actions, matching, payment state and webhook delivery.
- No real bank notifications were processed.
- No SMS access was added.
- No Accessibility scraping was added.
- No broad installed-app enumeration was added.
- No raw card, raw phone or raw notification text was exposed.
- Real-bank auto-confirmation remains disabled.

## Work Completed

### 1. Premium Runtime Contract Boundary

Added/validated:

- `PremiumMerchantRuntime`
- premium dashboard state
- premium review queue state
- premium payment detail state
- premium connected-site state
- premium configuration-test state

Purpose:

- Keep premium Compose UI separated from raw API/repository logic.
- Let the UI consume safe merchant-facing state.
- Keep backend contracts typed and testable.

Main file:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt`

## 2. Android Premium UI API Wiring

The premium Android merchant UI now uses the existing Sprint 7F Android merchant repositories where backend access is available.

Wired contracts:

- `GET /v1/android-merchant/dashboard-summary`
- `GET /v1/reviews`
- `GET /v1/android-merchant/payments/:id`
- `POST /v1/reviews/:id/confirm`
- `POST /v1/reviews/:id/reject`
- `GET /v1/android-merchant/connected-site`
- `POST /v1/android-merchant/configuration-test`

Important:

- `/v1/reviews` remains the existing authenticated review API contract for Android merchant queue/actions.
- A future sprint may add a dedicated `/v1/android-merchant/reviews` facade, but this pass did not change backend APIs.

## 3. Auth/Session Boundary Fix

Multi-agent review found that `MainActivity` always started `PremiumMerchantRuntime.localDev()`.

That was too permissive because it created local/dev auth by default.

Fixed:

- `MainActivity` now calls `PremiumMerchantRuntime.forAppBuild()`.
- Debug builds may use local/dev auth for local QA.
- Non-debug builds use `PremiumMerchantRuntime.disconnected()`.
- Non-debug builds no longer create a `Bearer test_*` dev session.

Main file:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/MainActivity.kt`

## 4. Backend-owned Review Action Clarification

Review confirm/reject actions remain backend requests, not Android-side decisions.

Added/validated:

- `MerchantReviewActionsApiRepository.backendOwnsReviewDecisions = true`
- `MerchantReviewActionsApiRepository.sendsDeveloperWebhookDirectly = false`
- `PremiumMerchantRuntime.reviewActionsAreBackendOwned`

Behavior:

- `Confirmer le paiement` calls the backend review confirm endpoint.
- `Rejeter le signal` calls backend reject with `scope=signal`.
- `Rejeter la commande` remains a separate explicit order-scoped action.
- Android does not emit payment webhooks.
- Android does not mutate orders directly outside authenticated backend endpoints.

Main file:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt`

## 5. Tests Added/Updated

Added:

- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/PremiumMerchantRuntimeContractTest.kt`

Updated:

- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantVisualArchitectureTest.kt`

Test coverage verifies:

- premium runtime calls the expected backend endpoint paths;
- visible UI state does not expose raw card;
- visible UI state does not expose raw phone;
- visible UI state does not expose webhook secrets;
- visible UI state does not expose internal backend reason codes;
- `official_bank_confirmation` is not shown in merchant UI;
- signal rejection does not reject the order by default;
- Android does not send developer webhooks directly;
- non-debug-safe disconnected runtime exists.

## 6. Validation Commands Run

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- Android `:app:testDebugUnitTest`
- Android `:app:assembleDebug`
- targeted `apps/android-receiver/src/android-runnable-app.test.ts`
- ADB APK install
- ADB app launch
- ADB reverse `tcp:8080 tcp:8080`
- ADB UI tree dump
- ADB screenshot capture

Full Node test result:

- 54 test files passed
- 372 tests passed

Android validation:

- `:app:testDebugUnitTest`: passed
- `:app:assembleDebug`: passed

ADB device used:

- Samsung SM-S916B
- serial: `R5CWA0FEPZW`

ADB note:

- The device transport changed during the session.
- Final successful install/launch used `transport_id:4`.

## 7. Docker / Live Backend Status

Fresh live backend validation is currently blocked by local Docker Desktop availability.

Failed:

- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health`

Docker error:

```text
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

API health error:

```text
Impossible de se connecter au serveur distant
```

Interpretation:

- This is an environment blocker, not a code/test blocker.
- The debug APK can run.
- The app cannot verify live endpoints until Docker Desktop exposes the Linux engine again and `localhost:8080` is healthy.

## 8. Files Updated in This Contract/API Pass

Key Android files:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/MainActivity.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumReviewScreens.kt`
- `apps/android-receiver/android/app/build.gradle.kts`

Key test/report files:

- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/PremiumMerchantRuntimeContractTest.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantVisualArchitectureTest.kt`
- `.swimpay-agent/ANDROID_PREMIUM_API_WIRING_REPORT.md`
- `.swimpay-agent/SPRINT_7F_REVALIDATION_REPORT.md`
- `.swimpay-agent/BLOCKERS.md`
- `.swimpay-agent/NEXT_ACTION.md`
- `.swimpay-agent/PROGRESS_LOG.md`

## 9. Remaining Gaps

Critical blockers:

- none in code validation.

Environment blocker:

- Docker Desktop is not reachable from the current shell.
- Live backend health cannot be freshly validated until Docker is restored.

Product/API follow-ups:

- Production merchant auth/session handoff is still needed.
- Connected-site delivery history should be hardened.
- A dedicated Android merchant review facade may be considered later if we want all Android merchant endpoints under `/v1/android-merchant/*`.
- Real notification shadow testing remains gated behind explicit consent and must not start automatically.

## 10. Recommendation

Recommended next sprint:

Sprint 7G - Production merchant auth/session handoff and connected-site delivery history hardening.

Suggested Sprint 7G scope:

1. Replace local/dev merchant auth with a production-safe Android merchant session contract.
2. Define token/session acquisition and refresh behavior.
3. Harden connected-site delivery history and developer details access.
4. Add live backend QA once Docker is healthy.
5. Keep real bank notification shadow testing behind the existing consent gate.

Do not do next:

- do not enable auto-confirmation;
- do not process real bank notifications without consent gate;
- do not claim official bank confirmation;
- do not expose raw card/phone;
- do not expose raw notification text;
- do not add SMS or Accessibility scraping.

## Final Result

Android premium merchant contract/API wiring is code-valid and device-valid.

Sprint 7F live backend validation is not freshly complete in this session because Docker Desktop is unavailable.

The next blocking action is local Docker recovery, followed by:

```powershell
docker compose --env-file .env.example -f infra/docker-compose.yml ps
Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health
```

