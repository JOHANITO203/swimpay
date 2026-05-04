# SwimPay Task Queue

The runner may prepare only one pending task at a time.

If a task file exists in `tasks/`, it can be prepared. If the root task file is missing, it is marked `missing` and is not automatic.

## Queue

- [x] `407_sberbank_shadow_test_preflight` - status: completed_with_pending_live_capture - source: `tasks/407_sberbank_shadow_test_preflight.md`
- [x] `408_sberbank_shadow_consent_and_flags` - status: completed_with_pending_live_consent - source: `tasks/408_sberbank_shadow_consent_and_flags.md`
- [ ] `409_sberbank_real_notification_capture_redaction` - status: blocked_pending_explicit_live_consent - source: `tasks/409_sberbank_real_notification_capture_redaction.md`
- [ ] `410_sberbank_shadow_parser_matching_review` - status: blocked_no_real_signal - source: `tasks/410_sberbank_shadow_parser_matching_review.md`
- [ ] `411_sberbank_manual_review_webhook_rehearsal` - status: blocked_no_review_row - source: `tasks/411_sberbank_manual_review_webhook_rehearsal.md`
- [x] `412_sberbank_shadow_test_report` - status: completed - source: `tasks/412_sberbank_shadow_test_report.md`

## Recently Completed

- [x] `350_hybrid_receiving_route_model` - status: completed - source: `tasks/350_hybrid_receiving_route_model.md`
- [x] `351_receiving_route_storage_and_api` - status: completed - source: `tasks/351_receiving_route_storage_and_api.md`
- [x] `352_buyer_sender_phone_matching_hint` - status: completed - source: `tasks/352_buyer_sender_phone_matching_hint.md`
- [x] `353_human_readable_payment_reference_generator` - status: completed - source: `tasks/353_human_readable_payment_reference_generator.md`
- [x] `354_checkout_bank_first_route_reveal_ui` - status: completed - source: `tasks/354_checkout_bank_first_route_reveal_ui.md`
- [x] `355_hybrid_route_matching_risk_policy` - status: completed - source: `tasks/355_hybrid_route_matching_risk_policy.md`
- [x] `356_webhook_route_context_no_pii` - status: completed - source: `tasks/356_webhook_route_context_no_pii.md`
- [x] `357_hybrid_receiving_routes_e2e_tests` - status: completed - source: `tasks/357_hybrid_receiving_routes_e2e_tests.md`
- [x] `358_sprint_7b_closeout_review` - status: completed - source: `tasks/358_sprint_7b_closeout_review.md`
- [x] `391_frontend_screen_inventory_audit` - status: completed - source: `tasks/391_frontend_screen_inventory_audit.md`
- [x] `392_merchant_onboarding_copy_alignment` - status: completed - source: `tasks/392_merchant_onboarding_copy_alignment.md`
- [x] `393_merchant_app_screen_gap_completion` - status: completed - source: `tasks/393_merchant_app_screen_gap_completion.md`
- [x] `394_merchant_state_empty_error_screens` - status: completed - source: `tasks/394_merchant_state_empty_error_screens.md`
- [x] `395_iconography_and_visual_tokens_alignment` - status: completed - source: `tasks/395_iconography_and_visual_tokens_alignment.md`
- [x] `396_buyer_checkout_screen_inventory_audit` - status: completed - source: `tasks/396_buyer_checkout_screen_inventory_audit.md`
- [x] `397_ui_copy_and_jargon_guardrails` - status: completed - source: `tasks/397_ui_copy_and_jargon_guardrails.md`
- [x] `398_frontend_screen_realignment_closeout` - status: completed - source: `tasks/398_frontend_screen_realignment_closeout.md`
- [x] `399_buyer_checkout_screen_inventory` - status: completed - source: `tasks/399_buyer_checkout_screen_inventory.md`
- [x] `400_buyer_checkout_copy_alignment` - status: completed - source: `tasks/400_buyer_checkout_copy_alignment.md`
- [x] `401_buyer_bank_first_flow_polish` - status: completed - source: `tasks/401_buyer_bank_first_flow_polish.md`
- [x] `402_buyer_payment_instructions_card_phone` - status: completed - source: `tasks/402_buyer_payment_instructions_card_phone.md`
- [x] `403_buyer_checkout_status_states` - status: completed - source: `tasks/403_buyer_checkout_status_states.md`
- [x] `404_buyer_desktop_qr_handoff` - status: completed - source: `tasks/404_buyer_desktop_qr_handoff.md`
- [x] `405_buyer_checkout_visual_guardrails_tests` - status: completed - source: `tasks/405_buyer_checkout_visual_guardrails_tests.md`
- [x] `406_buyer_checkout_closeout_review` - status: completed - source: `tasks/406_buyer_checkout_closeout_review.md`
