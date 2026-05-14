# Android Full Visual Rebuild Audit

Date: 2026-05-14
Scope: Android Merchant premium UI only.

## Findings

The previous UI still mixed old premium theme components with the mockup language. Main residue sources:

- `PremiumDesignTokens.kt` still exposed a light/old palette through `PremiumColors`.
- `PremiumComponents.kt` still rendered old `PremiumAppShell`, `PremiumBottomNav`, `PremiumCard`, `PremiumPrimaryButton`, `PremiumOutlineButton`, `SwimPayLogo`, `PremiumStatePanel`.
- Runtime bottom navigation still had 4 old tabs: Accueil, Revue, Ventes, MENU.
- Onboarding receiving setup still allowed only one method visually and used old bank choice cards.
- Ozon was present in the app bank target list but missing from onboarding UI-selectable IDs.
- Screen 11 had no dedicated integrations-list surface; the closest integration screen was the detail surface.

## Non-goals respected

No backend, API contract, payment runtime, webhook runtime, receiver runtime, database, SDK or state-machine files were intentionally changed.
