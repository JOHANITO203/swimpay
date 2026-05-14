# Android Merchant Visual Gate Policy

Date: 2026-05-14

## Purpose

Roborazzi protects approved Android Merchant visuals, but it must not block day-to-day design polish. Visual regression is now a freeze/release gate, not the live iteration gate.

This policy only moves screenshot gates. Product truth, privacy, payment, webhook, receiver and security guardrails stay active.

## Mode A - Design Polish Mode

Use this while refactoring screens toward the mockups.

Default behavior:

- Roborazzi screenshot tests are excluded from normal Android unit tests.
- `PremiumGoldenScreenshotTest` is not run by default.
- `PremiumReferencePngComparisonTest` is not run by default.
- Legacy visual-structure assertions in `PremiumDesignGuardrailsTest` are not run by default during mockup-mirror refactors.
- Compile, non-screenshot unit tests and APK builds still run.
- Manual/emulator screenshots can be used freely during iteration.

Recommended commands:

```bash
npm run android:compile
npm run android:test
npm run android:assemble:staging
```

Do not use Roborazzi as a blocking check during quick polish loops.

## Mode B - Visual Freeze Mode

Use this when a screen or group of screens is ready for approval.

Commands:

```bash
npm run android:visual:record
npm run android:visual:verify
```

Optional explicit gate:

```bash
RUN_VISUAL_GOLDENS=true apps/android-receiver/android/gradlew -p apps/android-receiver/android :app:testDebugUnitTest
```

On Windows PowerShell:

```powershell
$env:RUN_VISUAL_GOLDENS='true'
apps\android-receiver\android\gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest
```

Freeze expectations:

- New goldens are recorded intentionally.
- Roborazzi verify passes.
- The visual diff report is updated when comparing against reference PNGs.
- No pixel-perfect claim is made unless screenshot evidence and visual diff support it.

## Mode C - Release Mode

Use this before release or an approved visual baseline merge.

Required:

- Android compile and non-screenshot tests.
- Debug/staging APK build as appropriate.
- Roborazzi verify.
- Product/security/privacy/runtime guardrails.
- Stable screenshot baselines with approved visual drift.

## Preserved Guardrails

The delock does not disable tests or rules that prevent:

- raw notification display;
- official bank confirmation claims;
- auto-confirmation wording or behavior;
- Android-owned webhook delivery wording;
- exposed secrets;
- fake runtime data;
- payment confirmation semantic drift;
- SMS, Accessibility, scraping or `QUERY_ALL_PACKAGES`.
