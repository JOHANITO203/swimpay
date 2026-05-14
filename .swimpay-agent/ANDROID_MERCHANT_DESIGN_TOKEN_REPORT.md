# Android Merchant Design Token Report

Date: 2026-05-13
Agent: Agent 2, Design System / Token Agent
Scope: Android Merchant premium UI visual sprint

## Files Changed

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDesignTokens.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt`
- `.swimpay-agent/ANDROID_MERCHANT_DESIGN_TOKEN_REPORT.md`

## What Changed

- Added dark-fintech surface primitives for the reference pack:
  - `SurfaceStrong`
  - `FieldSurface`
  - `FieldBorder`
  - `GlassSurface`
  - `GlassBorder`
  - `GlassHighlight`
- Added accent primitives used across the references:
  - `AccentGreen`
  - `AccentLime`
  - `AccentPurple`
- Added reusable non-data visual primitives:
  - `PremiumStroke`
  - `PremiumAlpha`
  - `PremiumComponentSize.FieldHeight`
  - `PremiumBrandGradient.Panel`
- Tuned dark palette values toward the 14 provided references: deeper near-black background, cooler glass surfaces, brighter green/lime primary gradient, and clearer warning/success contrast.
- Added reusable components:
  - `PremiumGlassPanel` for glass cards/navigation containers.
  - `PremiumInputShell` for login/search/form field shells.
  - `PremiumAccentOutlineButton` for green outline actions such as create/review-style buttons.
- Updated existing shared components to consume the new tokens:
  - `PremiumBottomNav` now uses `PremiumGlassPanel`.
  - `PremiumCard` uses tokenized stroke/elevation/border alpha.
  - `PremiumGradientPanel` uses `PremiumBrandGradient.Panel`.
  - `PremiumIconTile` uses `PanelTint`.
  - `StatusChip` uses mode-aware tone tokens.
  - Primary gradient buttons use dark text in dark theme to match the bright fintech CTA treatment.

## What Stayed Unchanged

- No runtime data, repository, payment, webhook, matching, review decision, Android permission, or manifest behavior was changed.
- No new images, drawables, logos, or unregistered assets were added.
- No screen route or navigation enum was changed; the current runtime bottom navigation remains source-compatible with existing tabs.
- Existing public component entry points remain source-compatible for current call sites.
- No raw notification UI or official bank-confirmation wording was introduced.

## Test-First Notes

- I inspected the existing static/token guardrail tests, but did not add or edit tests because this agent's explicit write ownership was limited to the two premium source files and this report.
- I did not touch QA-owned screenshot tests or snapshots.

## Verification

- Passed: `.\gradlew.bat :app:compileDebugKotlin "-Pkotlin.incremental=false" --no-daemon --stacktrace --max-workers=1`
- Attempted: `.\gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest --tests com.swimpay.receiver.PremiumMerchantSettingsStateTest --tests com.swimpay.receiver.PremiumDesignGuardrailsTest "-Pkotlin.incremental=false" --no-daemon --stacktrace --max-workers=1`
  - Blocked during test compilation by existing QA screenshot test source: `PremiumGoldenScreenshotTest.kt` unresolved reference `onAllNodes`.
  - Not changed because screenshot test files are outside this agent's write scope.
- Attempted: `.\gradlew.bat :app:assembleDebug "-Pkotlin.incremental=false" --no-daemon --stacktrace --max-workers=1`
  - Kotlin compilation completed, then the Gradle daemon disappeared during later packaging/dex work. A crash log was written at `apps/android-receiver/android/hs_err_pid4788.log`.

## Remaining Token Gaps

- The reference pack uses five operational bottom tabs; the current runtime enum still exposes four. This needs a navigation/product-owned change, not a token-only change.
- Several screen files still contain one-off hardcoded radii, borders, and accent colors. The new `PremiumGlassPanel`, `PremiumInputShell`, `PremiumStroke`, and accent tokens are ready for those screen owners to adopt without inventing new values.
- The reference background has subtle smoky texture. This pass kept the implementation asset-free; any texture/image treatment needs explicit asset registry approval.
