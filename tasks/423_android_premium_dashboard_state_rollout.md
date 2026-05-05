# Task 423 - Android premium dashboard state rollout

Scope: Android premium frontend only.

- Wrap dashboard/home loading, empty, action-required, error and offline paths with `PremiumScreenState`.
- Do not fall back to preview dashboard rows for repository failure or empty live data.
- Keep existing dashboard content layout for content state.
- Add tests proving dashboard failures and empty data do not show demo rows.

