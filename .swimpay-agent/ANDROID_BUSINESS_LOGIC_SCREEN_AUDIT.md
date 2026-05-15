# Android Business Logic Screen Audit

generated_at: 2026-05-15T01:55:00+03:00

## Scope

Audit requested after the operator reported that the design pass hid or broke existing app features. This audit compares the current Android Merchant premium shell against the pre-design source of truth before the 13 May visual pass.

Reference baseline:

- code commit: `2149c8e` from 2026-05-12 23:18:36 +0300.
- reports before 13 May:
  - `.swimpay-agent/ANDROID_SUBSCREENS_INVENTORY.md`
  - `.swimpay-agent/ANDROID_SUBSCREENS_NAVIGATION_REPORT.md`
  - `.swimpay-agent/ANDROID_LANGUAGE_LOCALIZATION_REPORT.md`
  - `.swimpay-agent/ANDROID_APPEARANCE_THEME_REPORT.md`
  - `docs/ANDROID_ACCOUNT_AND_ONBOARDING_TRUTH.md`
  - `docs/01_PRODUCT_REQUIREMENTS.md`

## Product Direction Confirmed

The app should stay simple:

- Account entry before onboarding.
- Google only for login recovery and `Paramètres > Sécurité`.
- Same merchant rights for personal/business profiles.
- No complex technical personas in Android UX.
- Settings must remain a simple operational menu.
- Existing features should be wired to existing repositories/local stores/backend contracts, not replaced by decorative screens.

## Regression Found

### Settings / Paramètres

Pre-design behavior:

- Bottom tab `Menu`/settings opened a simple menu.
- Menu rows included:
  - banks;
  - receiving methods;
  - confirmation mode;
  - developer integration;
  - notifications/receiver health;
  - appearance/theme;
  - language;
  - security;
  - support;
  - help center.

Current regression found:

- `PremiumSettingsScreen` immediately rendered `PremiumSecurityScreen` and returned.
- This hid the existing settings menu.
- `Langue` and `Apparence` still existed in code/routes, but the user could no longer find them from the main settings tab.
- This was not a missing backend contract; it was a UI composition regression introduced by the visual/shell pass.

Fix applied:

- Restored `PremiumSettingsScreen` as the simple menu surface.
- Kept `PremiumSecurityScreen` as a dedicated sub-screen reached through the existing `Sécurité` row.
- Added a guardrail test so the settings tab cannot silently become the security screen again.

### Button / Action Wiring

Regression found:

- Some visual cards were clickable-looking but had no runtime callback from the active route.
- Main `Récepteurs` tab rendered receiving methods without create/edit/delete callbacks.
- Dashboard quick actions were decorative instead of navigating to the existing screens.

Fix applied:

- Dashboard actions now route to existing reviews, receiving methods, integrations and receiver health.
- Main `Récepteurs` tab now uses the existing receiving-method runtime callbacks.
- No new feature was added.

## Current Feature Matrix

| Surface | Source of truth | Current status |
| --- | --- | --- |
| Language | local `PremiumMerchantSettingsStore`, `PremiumLanguageScreen` | restored in settings menu |
| Theme | local `PremiumMerchantSettingsStore`, `PremiumAppearanceScreen`, `MainActivity` theme resolver | restored in settings menu |
| Security / Google link | local settings + Android Google ID token + backend auth repository | reachable from settings menu via Security |
| App lock | local settings + Android system unlock | reachable from Security |
| Receiving methods | backend receiving-method repository | wired in tab and route |
| Reviews | backend review repository/actions | wired |
| Integrations | existing single connected-site/developer integration repositories | partially wired; true multi-site list remains a contract gap |
| Receiver health | local notification/receiver state | partially wired; deeper remote health remains a contract gap |
| Remote sessions/devices | no repository before design pass | must stay honest unavailable |

## Do Not Add

- No new themes beyond the existing `system/light/dark` local preference unless explicitly requested.
- No new technical settings categories just to fill space.
- No fake multi-device sessions.
- No fake multi-site integrations.
- No backend contract invention from the Android UI.

## Remaining Audit Items

- Review `PremiumSecurityScreen` copy and row structure for simplicity; avoid turning settings into technical diagnostics.
- Verify on device that Settings -> Langue and Settings -> Apparence are visible and selectable.
- Verify that Google link remains under Settings -> Sécurité, not onboarding.
