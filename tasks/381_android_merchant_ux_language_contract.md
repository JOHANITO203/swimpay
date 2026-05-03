# Task 381 - Android merchant UX language contract

Status: completed

Scope:
- Create `docs/ANDROID_MERCHANT_UX_LANGUAGE.md`.
- Define allowed merchant-facing words and forbidden technical words.
- Centralize Android merchant UI copy constants where supported.
- Add tests that merchant-facing UI does not expose forbidden jargon.

Guardrails:
- No official bank confirmation claims.
- No raw PII in merchant-facing UI.
- Technical terms may appear only in internal tests, developer screens, API docs or debug panels.
