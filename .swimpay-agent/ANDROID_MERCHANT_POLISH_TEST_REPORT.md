# Android Merchant Polish Test Report

Date: 2026-05-12

## Tests Added Or Updated

- Runtime menu/profile has no static `JD` or fake UID.
- Configuration checklist no longer uses `MerchantConfigurationChecklist.allReady()` in runtime.
- Receiver Health no longer invents fixed bank counts, trusted bank counts, or zero queue.
- Payment detail no longer invents `Il y a 2 min`.
- Review tabs expose selected filter, filtered items, and real counters.
- Receiving method bank list and onboarding bank list use the shared catalog.
- Developer integration missing URL is explicitly non-configured and examples are marked.
- Confirmation mode does not expose auto-confirmation / AI activation copy.

## Commands Run

```powershell
apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.premiumRuntimeScreensDoNotUseStaticMerchantProfileOrReadinessData --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.premiumPolishUsesSharedBankCatalogAndRealReviewFilters --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.developerAndConfirmationPolishDoNotShowMisleadingPlaceholdersOrAutoConfirmOptions --no-daemon --stacktrace --max-workers=1
```

Result: passed after fixing the runtime implementation.

```powershell
apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest --tests com.swimpay.receiver.PremiumMerchantRuntimeContractTest --tests com.swimpay.receiver.AndroidDataHydrationTest --no-daemon --stacktrace --max-workers=1
```

Result: passed, 41 tests.

```powershell
npm run android:doctor
npm run typecheck
npm run lint
npm test
npm run build
docker compose --env-file .env.example -f infra/docker-compose.yml config
```

Result: passed. `npm test` reported 77 files and 667 tests passed.

```powershell
apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1
```

Result: passed, 216 Android JVM tests.

```powershell
apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleDebug --no-daemon --stacktrace --max-workers=1
```

Result: passed.

## Notes

Gradle daemon disappeared once with default memory. Re-run with explicit Gradle JVM args completed and exposed real test failures, then passed.
