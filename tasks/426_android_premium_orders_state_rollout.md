# Task 426 - Android premium orders state rollout

Scope: Android premium frontend only.

- Replace hardcoded orders rows with `PremiumScreenState<PremiumOrdersUiState>`.
- Use explicit empty/action-required/error/offline states.
- Keep order detail route typed and safe.
- Do not add or change backend APIs.
- Add tests proving static demo order rows are no longer the fallback.

