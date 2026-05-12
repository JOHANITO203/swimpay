# Android Visual Regression Test Report

generated_at: 2026-05-12T21:12:00+03:00

## Automated Screenshot Status

Roborazzi is now configured for Android Merchant Compose golden baselines.

Versioned baselines:

- `apps/android-receiver/android/app/src/test/snapshots/premium_dashboard.png`
- `apps/android-receiver/android/app/src/test/snapshots/premium_review_list.png`
- `apps/android-receiver/android/app/src/test/snapshots/premium_review_detail.png`
- `apps/android-receiver/android/app/src/test/snapshots/premium_receiver_health.png`

## Commands

```powershell
npm run android:screenshot:record
npm run android:screenshot:verify
```

Both commands passed during the visual golden baseline sprint.

## Existing Static Guardrails

Static JVM guardrails remain in `AndroidMerchantVisualArchitectureTest` for:

- asset registry assumptions;
- official launcher resource wiring;
- forbidden ad-hoc runtime logo assets;
- required token primitives;
- central button/tone/elevation token usage.

## Remaining Gap

The next visual gate should add hosted checkout browser screenshots and extend Android golden coverage to receiving methods, developer integration and confirmation mode.
