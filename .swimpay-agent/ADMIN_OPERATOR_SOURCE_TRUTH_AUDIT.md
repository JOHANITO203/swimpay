# Admin / Operator Source Truth Audit

Date: 2026-05-08

## Result

Operator Intelligence monitoring surfaces are privacy-aligned, but active admin bank-template vocabulary has V1 wording debt.

## Verified Aligned

- Feedback and unknown-shape surfaces expose redacted/safe Intelligence data only.
- Feedback is read-only/supervised input.
- Unknown-shapes are read-only monitoring.
- No raw notification title/body/text is shown in normal operator surfaces.
- No raw phone/card is shown in normal operator surfaces.
- Webhook secrets and API keys remain masked or show-once depending on lifecycle endpoint.
- No active operator UI copy was found claiming official bank confirmation.

## Contradictions

- `apps/api/src/admin.ts` still computes and exposes `auto_confirm_allowed_by_template` in admin/template audit response vocabulary.
- Bank-template profile vocabulary can expose `autoConfirmStatus`.
- Runtime does not use these fields to confirm V1 payments, but the wording is misleading before real operator testing.

## Must Fix Before Real Notification Tests

- Rename or quarantine active admin/operator `auto_confirm*` wording to manual-review readiness vocabulary.
- Keep any migration additive and compatibility-safe.

