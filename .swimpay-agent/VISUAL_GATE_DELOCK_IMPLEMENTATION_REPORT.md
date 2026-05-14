# Visual Gate Delock Implementation Report

Date: 2026-05-14

## Implemented Policy

Roborazzi is now an explicit visual gate instead of a default unit-test gate.

## Code Changes

| File | Change |
| --- | --- |
| `apps/android-receiver/android/app/build.gradle.kts` | Excludes `PremiumGoldenScreenshotTest`, `PremiumReferencePngComparisonTest`, and legacy `PremiumDesignGuardrailsTest` from default `Test` tasks unless visual goldens are explicitly requested or a Roborazzi task is being run. |
| `package.json` | Added `android:compile`, `android:test`, `android:visual:record`, `android:visual:verify`, and `android:visual:accept` aliases. Existing `android:screenshot:*` commands remain. |
| `.github/workflows/ci.yml` | Android receiver validation explicitly runs with `RUN_VISUAL_GOLDENS=false` and labels the step as non-visual unit testing plus staging build. |

## Visual Tests Moved Out Of Default Path

- `com.swimpay.receiver.ui.premium.PremiumGoldenScreenshotTest`
- `com.swimpay.receiver.ui.premium.PremiumReferencePngComparisonTest`
- `com.swimpay.receiver.PremiumDesignGuardrailsTest`

## Manual Visual Gate

Run Roborazzi manually with:

```bash
npm run android:visual:record
npm run android:visual:verify
```

or force inclusion inside normal Gradle tests:

```bash
RUN_VISUAL_GOLDENS=true ./gradlew :app:testDebugUnitTest
```

## Guardrails Preserved

No product/security/payment/runtime guardrails were disabled. The delock only affects visual screenshot tests.

The product copy guard for "confirmation bancaire officielle" was tightened to allow the required negated truth statement ("SwimPay n'est pas une banque...") while still blocking positive official-confirmation claims.

## Validation

Passed:

- `npm run android:compile`
- `npm run android:test`
- `npm run android:assemble:staging`
- `& "apps\\android-receiver\\android\\gradlew.bat" -p apps/android-receiver/android :app:assembleDebug --no-daemon --stacktrace --max-workers=1`

Not run as blocking validation:

- `npm run android:visual:verify`
- `npm run android:visual:record`
