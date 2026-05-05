# SwimPay Task Queue

The runner may prepare only one pending task at a time.

If a task file exists in `tasks/`, it can be prepared. If the root task file is missing, it is marked `missing` and is not automatic.

## Queue

- [x] `413_android_frontend_legacy_reference_audit` - status: completed - source: `tasks/413_android_frontend_legacy_reference_audit.md`
- [x] `414_android_frontend_legacy_purge` - status: completed - source: `tasks/414_android_frontend_legacy_purge.md`
- [x] `415_android_premium_visual_tests_replacement` - status: completed - source: `tasks/415_android_premium_visual_tests_replacement.md`
- [x] `416_android_frontend_source_of_truth_report` - status: completed - source: `tasks/416_android_frontend_source_of_truth_report.md`

## Recently Completed / Blocked

- [x] `407_sberbank_shadow_test_preflight` - status: completed_with_pending_live_capture - source: `tasks/407_sberbank_shadow_test_preflight.md`
- [x] `408_sberbank_shadow_consent_and_flags` - status: completed_with_pending_live_consent - source: `tasks/408_sberbank_shadow_consent_and_flags.md`
- [ ] `409_sberbank_real_notification_capture_redaction` - status: blocked_pending_explicit_live_consent - source: `tasks/409_sberbank_real_notification_capture_redaction.md`
- [ ] `410_sberbank_shadow_parser_matching_review` - status: blocked_no_real_signal - source: `tasks/410_sberbank_shadow_parser_matching_review.md`
- [ ] `411_sberbank_manual_review_webhook_rehearsal` - status: blocked_no_review_row - source: `tasks/411_sberbank_manual_review_webhook_rehearsal.md`
- [x] `412_sberbank_shadow_test_report` - status: completed - source: `tasks/412_sberbank_shadow_test_report.md`
