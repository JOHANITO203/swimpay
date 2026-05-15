# Android Roborazzi Visual Freeze Report

Date: 2026-05-16

## Scope

Aligned Android Merchant Roborazzi baselines with the approved post-design-token state.

No backend, API contract, database, payment runtime, webhook runtime, receiver runtime or SDK behavior was changed.

## Roborazzi Coverage Updated

- `premium_dashboard.png`
- `premium_review_list.png`
- `premium_review_detail.png`
- `premium_receiver_health.png`
- `premium_receiving_methods.png`
- `premium_developer_integration.png`
- `premium_confirmation_mode.png`
- `premium_security.png`
- `premium_startup_splash.png`

## Test Matrix Updates

- Added a startup splash golden to lock the launcher/splash visual relationship.
- Added a security screen golden to lock the Google row icon rendering.
- Updated launcher guardrails to accept the canonical vector foreground used by both splash and adaptive launcher resources.
- Updated dashboard hydration assertions to match the approved removal of the home-screen `Lancez un test` action.

## Validation

Passed:

- `npm run android:screenshot:record`
- `npm run android:screenshot:verify`

## Result

Roborazzi is now aligned to the current Android Merchant visual tokens and can be used again as the visual regression gate for these covered premium surfaces.
