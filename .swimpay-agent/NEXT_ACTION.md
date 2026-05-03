# Next Action

generated_at: 2026-05-03T15:05:00+03:00

## Latest Sprint

Sprint 6A - Five-bank MVP Validation Matrix and Private Beta Readiness.

## Status

PASS.

Sprint 6A implementation is present:

- `.swimpay-agent/PHASE_6_FIVE_BANK_MVP_PLAN.md`
- `docs/FIVE_BANK_MVP_VALIDATION_MATRIX.md`
- `packages/bank-templates/v1-bank-mvp-matrix.json`
- `docs/FIVE_BANK_NOTIFICATION_SHADOW_POLICY.md`
- `docs/BETA_MERCHANT_ONBOARDING_FLOW.md`
- `docs/PRIVATE_BETA_READINESS.md`
- `tests/five-bank-mvp-readiness.test.ts`

Production/admin hardening is paused. The current product priority is five-bank MVP validation and private beta readiness.

## Next Recommended Action

Proceed to Sprint 6B - Five-bank Package Evidence Collection Wave.

Recommended scope:

1. Collect explicit operator package-name input for Tinkoff / T-Bank, VTB, Alfa-Bank and Gazprombank.
2. Run one-package PackageManager evidence dry runs only for explicitly provided packages.
3. Submit evidence as `pending_operator_review`.
4. Approve evidence only as `approved_for_review_only`.
5. Update the five-bank matrix after each bank.
6. Keep real bank notifications and auto-confirmation out of scope.

## What Not To Do Next

- Do not deploy.
- Do not process real bank notifications.
- Do not enumerate installed apps.
- Do not guess bank package names.
- Do not invent certificate fingerprints.
- Do not read SMS.
- Do not scrape bank apps.
- Do not expose raw phone or raw notification text.
- Do not commit production secrets.
- Do not use `ADMIN_AUTH_MODE=dev_token` for production.
- Do not add Android payment confirmation.
- Do not add Android auto-confirmation.
- Do not treat review-only evidence as production trust.
- Do not leave rehearsal production trust approved after a drill.
