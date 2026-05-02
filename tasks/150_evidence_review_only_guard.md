# 150 — Evidence Review-only Guard

## Goal

Ensure observed package/cert metadata can only enable review-only readiness until explicit backend/operator verification.

## Scope

- Concrete evidence maps to `pending_verification`.
- Placeholder evidence remains `TO_VERIFY`.
- Synthetic debug evidence remains `synthetic_debug_only`.
- No evidence path creates production trusted readiness.

## Validation

- Add tests covering concrete evidence, placeholders and synthetic debug evidence.
