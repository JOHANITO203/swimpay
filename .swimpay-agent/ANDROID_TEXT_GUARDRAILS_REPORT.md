# Android Text Guardrails Report

Date: 2026-05-14

Added:
- `AndroidPremiumTextIntegrityTest`

Guardrails:
- Fails if premium UI source contains replacement character `\uFFFD`.
- Fails if common mojibake markers appear in premium UI source.
- Verifies bottom nav labels exist in French.
- Verifies dashboard uses `PremiumDashboardGreeting`.
- Verifies important text helpers use `Hyphens.None` and `LineBreak.Heading`.

Adjusted stale tests:
- Updated navigation/golden/static tests that still referenced old `PremiumMainTab.Menu` / `PremiumMainTab.Orders`.

Validation:
- `:app:testDebugUnitTest --tests com.swimpay.receiver.AndroidPremiumTextIntegrityTest` passed.

