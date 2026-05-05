# Task 425 - Android premium payment detail state rollout

Scope: Android premium frontend only.

- Wrap payment detail loading, missing/error/action-required and content paths with `PremiumScreenState`.
- Hide confirm/reject actions unless payment detail is content.
- Do not show fake payment amount/reference/bank for missing/error/action-required states.
- Add tests.

