# Android Frontend Dead UI Cleanup Report

Date: 2026-05-15

## Removed or Rewired

### Dashboard quick widgets

Before:

- Metric cards looked tappable but had no action.
- `Voir tout` in payment history was text-only.

After:

- `À confirmer` opens `Revue`.
- Other metric cards open `Business`.
- `Voir tout` opens `Business`.

Files:

- `PremiumDashboardScreens.kt`
- `PremiumMerchantApp.kt`

### Business decorative filters/search

Before:

- Business screen showed static filter chips.
- Search field had `onValueChange = {}` and did not affect results.
- Filter icon had no connected behavior.

After:

- Nonfunctional filter/search controls removed from the Business screen.
- Empty-state secondary text now opens `Revue`.

Reason: no backend/list filter contract is currently wired for those controls; keeping them visible created false affordances.

## Kept For Now

### Preview defaults

Composable default preview states and `preview()` companion functions remain. They are not runtime data when `PremiumMerchantApp` supplies state.

### Developer actions

Developer integration actions remain because they are wired to repositories. They need merchant-friendly presentation cleanup, not removal at this stage.

### Android confirm action

Kept for now because tests and current repository code expect it, but it is flagged in `ANDROID_FRONTEND_CONTRADICTIONS_REPORT.md`.

