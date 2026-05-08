# Task 621 - Intelligence Source Truth Guardrails

Status: completed

Scope:
- Added/updated tests to enforce the source of truth around runtime, webhooks, Android boundaries, SDK boundaries, raw notification rejection and central documentation.

Result:
- Added `tests/swimpay-intelligence-source-truth.test.ts`.
- Added a backend signal regression in `apps/api/src/signals.test.ts`.
- Fixed `apps/api/src/signals.ts` so legacy receiver signal payloads reject nested raw notification, phone, card and credential fields before normalization.

Validation:
- Red test observed for the legacy raw-field gap: accepted 201 before fix.
- Red test observed for missing central source-of-truth document.
- Targeted receiver signal tests pass after fix.
