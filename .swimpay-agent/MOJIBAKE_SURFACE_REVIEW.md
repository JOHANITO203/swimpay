# Mojibake Surface Review

generated_at: 2026-05-16T14:25:00+03:00

## Scope

- Full repository text scan.
- Ignored generated/vendor/binary surfaces: `node_modules`, `.git`, `.gradle`, `build`, `dist`, visual baselines, screenshots and binary assets.

## Findings

1. Android premium tests contained real mojibake:
   - `ConnectÃ©`
   - `Activez l'accÃ¨s notifications`
   - `â€¢â€¢â€¢â€¢ 4821`
   - `aprÃ¨s connexion au backend`

2. `packages/bank-templates/src/fixtures.ts` and `packages/bank-templates/src/parser.ts` intentionally contain mojibake-like strings.
   - These strings are compatibility fixtures for malformed bank-notification encodings.
   - They are allowlisted and were not changed in this pass.

## Fixes

- Replaced Android test mojibake with UTF-8 or explicit Unicode escapes.
- Added `tests/mojibake-surface.test.ts` as a repository-level guardrail.
- The guardrail allows mojibake only in the bank-template encoding compatibility files.

## Remaining Risk

- Visual baseline HTML snapshots are excluded because they are generated artifacts. They should be regenerated, not manually edited, if copy changes.
