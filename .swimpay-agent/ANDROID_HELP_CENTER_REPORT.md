# Android help center report

generated_at: 2026-05-09T00:08:00+03:00

Implemented a static V1-safe Centre d'aide screen in `PremiumDashboardScreens.kt`.

## Result

- Added categorized merchant help topics.
- Added search/filter support.
- Covered receiver readiness, receiving methods, manual review, webhooks, notification access and offline receiver states.
- Avoided literal Android-side `payment.confirmed` wording to preserve the existing Android non-confirmation guardrail.
- Avoided official bank confirmation claims, PSP/SBP integration claims, auto-confirmation promises and bank scraping language.

## Boundary

- Local static content is acceptable V1 content.
- Future backend help-content adapter can be added without changing payment semantics.
