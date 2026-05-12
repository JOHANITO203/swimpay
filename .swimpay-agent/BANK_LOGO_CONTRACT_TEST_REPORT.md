# Bank Logo Contract Test Report

generated_at: 2026-05-12T22:55:00+03:00

## Tests Added / Updated

- `packages/contracts/src/checkout.test.ts`
  - Ozon Bank is selectable.
  - Ozon Bank is runtime verified by operator.
  - Ozon Bank keeps `auto_confirm_enabled=false`.
  - Ozon Bank keeps `official_bank_confirmation=false`.
  - Each receiver bank exposes `logo_asset_key`.
- `apps/web/src/checkout.test.ts`
  - Checkout Step 1 shows Ozon Bank and logo asset key.
  - Checkout Step 2 shows receiver bank logo asset key.
- `packages/bank-templates/src/registry.test.ts`
  - Ozon template profile remains manual-review-only while package capability is runtime verified.
- Android JVM tests:
  - Bank target lock includes Ozon exact package.
  - Ozon profile stays review-only while certificate is `documented_unknown`.
  - Static bank profiles remain non-auto-confirming.
  - Local Android notifications use the registered monochrome small icon, not framework placeholder icons.

## Visual Baselines

- `npm run android:screenshot:verify`: passed.
- `npm run checkout:screenshot:verify`: passed.
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`: passed.
- `npm run android:assemble:staging`: passed.

## Safety

No test weakens manual-confirmation-only semantics.
