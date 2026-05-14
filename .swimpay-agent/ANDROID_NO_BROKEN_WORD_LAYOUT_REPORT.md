# Android No Broken Word Layout Report

Date: 2026-05-14

Implemented:
- Added `PremiumText.kt` with reusable important-text wrappers:
  - `PremiumScreenTitle`
  - `PremiumSectionTitle`
  - `PremiumCardTitle`
  - `PremiumMetricValue`
  - `PremiumBodyText`
  - `PremiumLabelText`
  - `PremiumBottomNavLabel`
  - `PremiumStatusChipText`
  - `PremiumDashboardGreeting`
- Important text helpers use `LineBreak.Heading` and `Hyphens.None`.
- Dashboard greeting now owns the full row and stacks as `Bonjour,` / `Merchant` on compact width instead of splitting inside `Merchant`.
- Date chip moved into its own row so it no longer steals title width.
- Bottom nav labels use a nav-specific 10sp style instead of the larger global mockup minimum.

Manual QA:
- `Bonjour, Merchant` no longer renders as `Merchan` / `t`.
- Bottom nav labels are readable in the connected-device dashboard capture.

