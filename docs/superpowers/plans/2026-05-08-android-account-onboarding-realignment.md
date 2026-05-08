# Android Account Onboarding Realignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Android-first account entry, lightweight account creation, optional Google recovery/linking and webhook-test-only onboarding path defined in `docs/ANDROID_ACCOUNT_AND_ONBOARDING_TRUTH.md`.

**Architecture:** Keep payment, Receiver and webhook safety boundaries unchanged. Add a mobile account/session layer before Android onboarding, then route `Creer un compte` into onboarding and `Se connecter` into recovery. Backend owns account/session/webhook-test decisions; Android only requests actions and renders state.

**Tech Stack:** Kotlin/Jetpack Compose Android app, Fastify API, PostgreSQL migrations, Vitest API tests, Android JVM unit tests. For Google on Android, prefer Android Credential Manager Sign in with Google and send the Google ID token to the backend for verification/exchange.

---

## Sources To Read First

- `AGENTS.md`
- `docs/ANDROID_ACCOUNT_AND_ONBOARDING_TRUTH.md`
- `docs/ANDROID_FRONTEND_API_CONTRACTS.md`
- `docs/ANDROID_MERCHANT_APP_SCREENS.md`
- `docs/05_DATABASE_SCHEMA.md`
- `docs/11_SECURITY_AND_PRIVACY.md`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumNavigationState.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingState.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt`
- `apps/api/src/auth-bff.ts`
- `apps/api/src/server.ts`
- `packages/database/migrations/010_auth_bff_foundation.sql`

## Non-Negotiables

- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Android must not confirm orders.
- Android must not send developer webhooks directly.
- No raw notification text, raw phone, raw card, raw device identifiers or secrets in logs/UI/webhooks.
- No SMS, Accessibility scraping, bank app scraping, `QUERY_ALL_PACKAGES` or broad app enumeration.
- Google is optional recovery/linking only, not onboarding.

## Multi-Agent Execution Model

Use one coordinator and five workers. Workers must use disjoint write scopes.

- Coordinator: owns branch hygiene, task sequencing, integration review, final validation and commit.
- Worker A Backend Identity: owns API/account/session/schema/auth tests.
- Worker B Android Account Entry: owns pre-onboarding navigation/session/account UI.
- Worker C Android Onboarding Branch: owns onboarding state/screens/copy/tests.
- Worker D Android Security Google Link: owns Security screen Google linking UI and tests.
- Worker E Guardrails QA: owns product-truth/static tests and docs consistency.

Do not dispatch two workers that edit `apps/api/src/server.ts` or the same Android screen file at the same time. Backend Identity is the only backend code worker.

## Wave 0 - Coordinator Baseline

- [ ] Run `git status --short` and note unrelated dirty files.
- [ ] Confirm branch is `main` only if the operator explicitly wants direct production branch work; otherwise create a short-lived branch.
- [ ] Run baseline checks likely to be affected:
  - `npm run typecheck`
  - `npm test -- apps/api/src/auth-bff.test.ts apps/api/src/android-merchant.test.ts`
  - `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`
- [ ] If baseline already fails, record exact failing tests before dispatching workers.

## Task 1 - Worker A Backend Identity Contract

**Files:**
- Modify: `packages/database/migrations/010_auth_bff_foundation.sql`
- Modify: `apps/api/src/auth-bff.ts`
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/src/auth-bff.test.ts`
- Test: `apps/api/src/android-merchant.test.ts`

- [ ] Add tests first for privacy-safe mobile device proof:
  - known device returns `known_device`;
  - unknown device returns `new_device`;
  - ambiguous/recovery case returns `recovery_required`;
  - raw device fields such as `imei`, `android_id`, `advertising_id`, `raw_fingerprint` are rejected.
- [ ] Add tests for Android account creation:
  - profile type `personal` creates user, merchant, owner-like membership and mobile session;
  - profile type `business` creates the same permission level;
  - first name and last name fields are rejected or ignored;
  - display pseudonym is generated server-side.
- [ ] Add tests for Google recovery/linking contract:
  - Google ID token exchange is a recovery/link action only;
  - unlinked Google identity does not silently create a merchant during `Se connecter`;
  - linked Google identity restores existing account/session;
  - missing Google config fails closed.
- [ ] Implement additive schema only:
  - nullable pseudonym/display handle support if missing;
  - mobile session/device proof storage if absent;
  - no destructive migration.
- [ ] Implement mobile account repository helpers in `auth-bff.ts`.
- [ ] Add API endpoints under `/v1/android-merchant/auth/*`:
  - `POST /device-lookup`
  - `POST /create-account`
  - `POST /google/exchange`
  - `POST /google/link`
- [ ] Ensure returned Android session material is opaque and safe for Android storage.
- [ ] Run:
  - `npm test -- apps/api/src/auth-bff.test.ts apps/api/src/android-merchant.test.ts`
  - `npm run typecheck`

## Task 2 - Worker B Android Account Entry And Navigation

**Files:**
- Create: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryState.kt`
- Create: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryScreens.kt`
- Modify: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumNavigationState.kt`
- Modify: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt`
- Test: Android unit tests beside existing `PremiumNavigationStateTest` and onboarding tests.

- [ ] Add route states before onboarding:
  - account entry;
  - create account profile choice;
  - login provider choice;
  - account recovery pending/error/success.
- [ ] Add tests proving first launch without mobile session routes to account entry, not onboarding.
- [ ] Add tests proving `Creer un compte` routes into profile choice then onboarding.
- [ ] Add tests proving `Se connecter` routes to login provider list and does not start onboarding.
- [ ] Add Compose screens with stable copy:
  - `Creer un compte`
  - `Se connecter`
  - `Profil personnel`
  - `Profil commerce`
  - no first-name/last-name inputs.
- [ ] Keep account entry independent from notification access and bank detection.
- [ ] Run:
  - `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`

## Task 3 - Worker C Android Onboarding Branch And Webhook Test

**Files:**
- Modify: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingState.kt`
- Modify: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt`
- Modify only if necessary: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt`
- Test: existing onboarding state/full-flow tests.

- [ ] Add failing tests for Step 5 branching:
  - `Configurer plus tard` sets skipped state and completes onboarding without configuration test;
  - `Ajouter maintenant` enters webhook test step;
  - webhook test completion enters the app;
  - `Tester sans site connecte` is absent.
- [ ] Replace generic configuration-test copy with webhook-test-only copy.
- [ ] Remove or re-route any flow that runs a "full" configuration test after skipping site/app setup.
- [ ] Ensure the test path still calls backend-owned test endpoint only.
- [ ] Preserve the receiving method SBP copy exception.
- [ ] Run:
  - `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`

## Task 4 - Worker D Android Security Google Link

**Files:**
- Modify: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- Modify if needed: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantUiModels.kt`
- Modify if needed: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt`
- Test: Android UI/static architecture tests.

- [ ] Add tests proving Google text/logo appears on `Securite`, not onboarding.
- [ ] Add a security row/action for Google profile recovery linking.
- [ ] Use Android Credential Manager Sign in with Google for implementation planning, sending only the Google ID token to backend exchange/link endpoints.
- [ ] Do not collect names from Google profile in Android account creation.
- [ ] Ensure UI labels say account recovery/linking, not required login.
- [ ] Run:
  - `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`

## Task 5 - Worker E Guardrails And Product Truth Tests

**Files:**
- Modify or create root Vitest guardrail tests under `tests/`
- Modify Android JVM guardrail tests if needed
- Modify docs only if tests reveal stale contradictions

- [ ] Add product-truth tests proving docs/code do not make Google a required onboarding step.
- [ ] Add Android static tests proving onboarding does not contain `Se connecter avec Google`.
- [ ] Add Android static tests proving no first/last-name account inputs exist in account creation.
- [ ] Add Android static tests proving `Tester sans site connecte` is removed.
- [ ] Add backend tests proving raw device identifiers are rejected.
- [ ] Add guardrails proving Android still does not send developer webhooks and does not confirm payments.
- [ ] Run:
  - `npm test -- tests/product-truth-docs.test.ts tests/sdk-android-product-truth.test.ts`
  - `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`

## Wave 2 - Coordinator Integration

- [ ] Review Worker A backend endpoints against Android API wiring needs.
- [ ] Wire Android repositories to backend endpoints only after Worker A contract is stable.
- [ ] Resolve route naming/copy conflicts.
- [ ] Run full local validation:
  - `npm run android:doctor`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `docker compose --env-file .env.example -f infra/docker-compose.yml config`
  - `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`
  - `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1`

## Wave 3 - Device QA, No Real Notification

- [ ] Install debug APK on operator device if available:
  - `adb devices -l`
  - `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`
  - `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity`
  - `adb -s R5CWA0FEPZW exec-out uiautomator dump /dev/tty`
- [ ] Verify first screen is account entry.
- [ ] Verify `Creer un compte` reaches onboarding.
- [ ] Verify personal/business choices have same rights copy.
- [ ] Verify no name fields appear.
- [ ] Verify `Se connecter` shows Google recovery.
- [ ] Verify `Parametres > Securite` shows Google linking.
- [ ] Verify `Configurer plus tard` enters the app.
- [ ] Verify `Ajouter maintenant` goes to webhook test.
- [ ] Do not trigger real bank notification capture.

## Final Commit

Commit only after validation passes and unrelated dirty files are excluded or intentionally included:

```text
sprint AUTH-ANDROID-1: android account onboarding realignment
```

## External Reference

Android Sign in with Google should follow official Android Credential Manager guidance:

- https://developer.android.com/identity/sign-in/credential-manager
- https://developer.android.com/identity/sign-in/credential-manager-siwg
- https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation

Current official docs say Credential Manager supports Sign in with Google on Android 4.4/API 19+ and recommends both the Credential Manager bottom sheet and a distinct Google button. The implementation guide also says to send the Google ID token to the relying-party server for validation before trusting it.
