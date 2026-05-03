# Next Action

generated_at: 2026-05-03T15:11:00+03:00

## Latest Sprint

Sprint 6B - Five-bank Package Evidence Collection Wave.

## Status

PASS.

Sprint 6B implementation is present:

- `.swimpay-agent/LIMITED_BANK_PACKAGE_DISCOVERY_AUTHORIZATION.md`
- `.swimpay-agent/BANK_PACKAGE_CANDIDATES.md`
- `.swimpay-agent/SPRINT_6B_REPORT.md`
- `packages/bank-templates/v1-bank-mvp-matrix.json`
- `docs/FIVE_BANK_MVP_VALIDATION_MATRIX.md`
- `tests/five-bank-package-evidence-wave.test.ts`

All selected V1 banks now have package evidence in the five-bank matrix. The four newly collected evidence rows are `approved_for_review_only`; Sberbank remains `production_trust_revoked` from the prior local drill. Auto-confirm remains disabled for all five banks.

## Next Recommended Action

Proceed to Sprint 6C - Five-bank Review-only Receiver Selection and Synthetic Shadow Runtime Rehearsal.

Recommended scope:

1. Select the five V1 bank profiles in the Receiver in review-only mode.
2. Run synthetic redacted notification-signal fixtures for each bank.
3. Verify review queue routing and webhook disclosure for each bank.
4. Verify `official_bank_confirmation=false` and `confirmation_type=notification_signal`.
5. Verify negative categories never auto-confirm.
6. Keep real bank notifications, production trust and auto-confirmation out of scope unless a later sprint explicitly authorizes them.

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
