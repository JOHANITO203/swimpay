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
- Sprint 6C rehearses synthetic redacted notification-signal fixtures only.
- Webhook disclosure remains `official_bank_confirmation=false` and `confirmation_type=notification_signal`.

## Matrix

| Bank profile | Bank | Package input | Package name | Cert evidence | Visibility | Receiver selection | Synthetic shadow | Real shadow | Sample notification | Parser | Review routing | Webhook | Auto-confirm | Beta readiness | Blockers |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `sber_ru` | Sberbank | operator_provided | `ru.sberbankmobile` | production_trust_revoked | visible_in_debug_operator_build | review_only_ready | passed | not_started | not_collected_real_bank | synthetic_shadow_passed | synthetic_review_queue_passed | synthetic_disclosure_passed | disabled | pending_real_notification_shadow | real notification shadow run not started |
| `tbank_ru` | Tinkoff / T-Bank | filtered_candidate_selected | `com.idamob.tinkoff.android` | approved_for_review_only | visible_via_adb_exact_lookup | review_only_ready | passed | not_started | not_collected | synthetic_shadow_passed | synthetic_review_queue_passed | synthetic_disclosure_passed | disabled | pending_real_notification_shadow | real notification shadow run not started |
| `vtb_ru` | VTB | filtered_candidate_selected | `ru.vtb24.mobilebanking.android` | approved_for_review_only | visible_via_adb_exact_lookup | review_only_ready | passed | not_started | not_collected | synthetic_shadow_passed | synthetic_review_queue_passed | synthetic_disclosure_passed | disabled | pending_real_notification_shadow | real notification shadow run not started |
| `alfa_ru` | Alfa-Bank | filtered_candidate_selected | `ru.alfabank.mobile.android` | approved_for_review_only | visible_via_adb_exact_lookup | review_only_ready | passed | not_started | not_collected | synthetic_shadow_passed | synthetic_review_queue_passed | synthetic_disclosure_passed | disabled | pending_real_notification_shadow | real notification shadow run not started |
| `gazprombank_ru` | Gazprombank | filtered_candidate_selected | `ru.gazprombank.android.mobilebank.app` | approved_for_review_only | visible_via_adb_exact_lookup | review_only_ready | passed | not_started | not_collected | synthetic_shadow_passed | synthetic_review_queue_passed | synthetic_disclosure_passed | disabled | pending_real_notification_shadow | real notification shadow run not started |

## Sprint 6C Synthetic Shadow Rehearsal

Sprint 6C validates review-only runtime behavior with synthetic redacted fixtures for all five V1 banks. The fixture set includes incoming transfer-like, amount-only, cashback, refund, outgoing/payment, promo and failed transfer cases.

Expected results:

- Incoming transfer-like signals route to review-only review queue handling, not auto-confirmation.
- Cashback, refund, outgoing/payment, promo and failed transfer cases never auto-confirm.
- Amount-only signals never auto-confirm.
- Webhook payloads, if emitted, disclose `official_bank_confirmation=false` and `confirmation_type=notification_signal`.
- Real notification shadow testing is not started.

## Next Human Inputs

- Sberbank: no package input needed for review-only baseline; future real notification shadow run still requires explicit approval.
- Tinkoff / T-Bank: review-only package evidence collected for `com.idamob.tinkoff.android`; future real notification shadow run still requires explicit approval.
- VTB: review-only package evidence collected for `ru.vtb24.mobilebanking.android`; future real notification shadow run still requires explicit approval.
- Alfa-Bank: review-only package evidence collected for `ru.alfabank.mobile.android`; future real notification shadow run still requires explicit approval.
- Gazprombank: review-only package evidence collected for `ru.gazprombank.android.mobilebank.app`; future real notification shadow run still requires explicit approval.

## Sprint 6B Evidence Wave

Sprint 6B used operator-authorized, keyword-filtered ADB package discovery only. The lookup did not report a full installed-app list. Exact PackageManager evidence was collected only for selected candidate package names and approved as `approved_for_review_only`. No production trust was requested or approved, and auto-confirm remains disabled for all five banks.

The machine-readable version lives at `packages/bank-templates/v1-bank-mvp-matrix.json`.
