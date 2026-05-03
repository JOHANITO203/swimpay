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
| `tbank_ru` | Tinkoff / T-Bank | filtered_candidate_selected | `com.idamob.tinkoff.android` | approved_for_review_only | visible_via_adb_exact_lookup | selectable_review_only | not_started | not_collected | synthetic_needed | review_only_required | synthetic_needed | disabled | partial | real notification shadow run not started |
| `vtb_ru` | VTB | filtered_candidate_selected | `ru.vtb24.mobilebanking.android` | approved_for_review_only | visible_via_adb_exact_lookup | selectable_review_only | not_started | not_collected | synthetic_needed | review_only_required | synthetic_needed | disabled | partial | real notification shadow run not started |
| `alfa_ru` | Alfa-Bank | filtered_candidate_selected | `ru.alfabank.mobile.android` | approved_for_review_only | visible_via_adb_exact_lookup | selectable_review_only | not_started | not_collected | synthetic_needed | review_only_required | synthetic_needed | disabled | partial | real notification shadow run not started |
| `gazprombank_ru` | Gazprombank | filtered_candidate_selected | `ru.gazprombank.android.mobilebank.app` | approved_for_review_only | visible_via_adb_exact_lookup | selectable_review_only | not_started | not_collected | synthetic_needed | review_only_required | synthetic_needed | disabled | partial | real notification shadow run not started |

## Next Human Inputs

- Sberbank: no package input needed for review-only baseline; future real notification shadow run still requires explicit approval.
- Tinkoff / T-Bank: review-only package evidence collected for `com.idamob.tinkoff.android`; future real notification shadow run still requires explicit approval.
- VTB: review-only package evidence collected for `ru.vtb24.mobilebanking.android`; future real notification shadow run still requires explicit approval.
- Alfa-Bank: review-only package evidence collected for `ru.alfabank.mobile.android`; future real notification shadow run still requires explicit approval.
- Gazprombank: review-only package evidence collected for `ru.gazprombank.android.mobilebank.app`; future real notification shadow run still requires explicit approval.

## Sprint 6B Evidence Wave

Sprint 6B used operator-authorized, keyword-filtered ADB package discovery only. The lookup did not report a full installed-app list. Exact PackageManager evidence was collected only for selected candidate package names and approved as `approved_for_review_only`. No production trust was requested or approved, and auto-confirm remains disabled for all five banks.

The machine-readable version lives at `packages/bank-templates/v1-bank-mvp-matrix.json`.
