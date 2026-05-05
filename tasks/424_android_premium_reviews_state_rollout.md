# Task 424 - Android premium reviews state rollout

Scope: Android premium frontend only.

- Wrap review queue loading, empty, action-required, error and offline paths with `PremiumScreenState`.
- Do not show `rev_demo_*` or preview payment rows for empty/error/action-required results.
- Keep review actions separated from order rejection behavior.
- Add tests proving safe copy and no forbidden jargon.

