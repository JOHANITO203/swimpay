# Android Settings Menu Restore Report

generated_at: 2026-05-15T01:55:00+03:00

## Restored

- Main settings tab is again a menu instead of directly rendering the Security screen.
- Existing rows restored to discoverable navigation:
  - receiving methods;
  - developer integration;
  - receiver health / notifications;
  - appearance;
  - language;
  - security;
  - support;
  - help center.

## Kept Existing Behavior

- Language selection continues to persist through `PremiumMerchantSettingsStore`.
- Theme selection continues to persist through `PremiumMerchantSettingsStore` and is applied through `MainActivity`.
- Google linking remains in the dedicated Security screen.

## Not Added

- No new feature.
- No backend/API/database/payment/webhook/receiver/SDK change.
- No new theme system.

## Validation

- `npm run android:compile` passed.
- `:app:testStagingUnitTest --tests com.swimpay.receiver.AndroidRuntimeWiringGuardrailTest` passed.
