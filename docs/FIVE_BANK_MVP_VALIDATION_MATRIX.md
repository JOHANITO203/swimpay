# Five-bank MVP Validation Matrix

SwimPay is a Payment Signal Engine. This matrix tracks MVP readiness for the selected V1 banks. It does not authorize real bank notification processing, official bank confirmation or auto-confirmation.

## Rules

- Do not invent package names or certificate fingerprints.
- Do not enumerate installed apps.
- Package evidence requires explicit operator package-name input.
- Real package evidence starts `pending_operator_review` and may become `approved_for_review_only`.
- Review-only evidence is not production trust.
- Production trust does not enable auto-confirmation by itself.
- Real bank notifications start shadow/review-only in a later approved sprint.
- Auto-confirm remains disabled for real banks.

## Matrix

| Bank profile | Bank | Package input | Package name | Cert evidence | Visibility | Receiver selection | Listener capture | Sample notification | Parser | Review routing | Webhook | Auto-confirm | Beta readiness | Blockers |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `sber_ru` | Sberbank | operator_provided | `ru.sberbankmobile` | production_trust_revoked | visible_in_debug_operator_build | selectable_review_only | not_started_real_bank | not_collected_real_bank | synthetic_only | review_only_required | synthetic_validated | disabled | partial | real notification shadow run not started |
| `tbank_ru` | Tinkoff / T-Bank | package_input_needed | - | not_collected | not_configured | selectable_review_only | not_started | not_collected | synthetic_needed | review_only_required | synthetic_needed | disabled | not_ready | explicit package name needed |
| `vtb_ru` | VTB | package_input_needed | - | not_collected | not_configured | selectable_review_only | not_started | not_collected | synthetic_needed | review_only_required | synthetic_needed | disabled | not_ready | explicit package name needed |
| `alfa_ru` | Alfa-Bank | package_input_needed | - | not_collected | not_configured | selectable_review_only | not_started | not_collected | synthetic_needed | review_only_required | synthetic_needed | disabled | not_ready | explicit package name needed |
| `gazprombank_ru` | Gazprombank | package_input_needed | - | not_collected | not_configured | selectable_review_only | not_started | not_collected | synthetic_needed | review_only_required | synthetic_needed | disabled | not_ready | explicit package name needed |

## Next Human Inputs

- Sberbank: no package input needed for review-only baseline; future real notification shadow run still requires explicit approval.
- Tinkoff / T-Bank: operator must provide one exact package name.
- VTB: operator must provide one exact package name.
- Alfa-Bank: operator must provide one exact package name.
- Gazprombank: operator must provide one exact package name.

The machine-readable version lives at `packages/bank-templates/v1-bank-mvp-matrix.json`.

