# SwimPay Task Queue

## Current Queue - Checkout runtime blocker (2026-05-13)

- [x] `staging_schema_reconciliation_audit` - status: completed_with_findings - source: `.swimpay-agent/STAGING_SCHEMA_RECONCILIATION_AUDIT.md`
- [x] `checkout_receiver_arming_blocker_audit` - status: completed_with_findings - source: `.swimpay-agent/CHECKOUT_RECEIVER_ARMING_BLOCKER_AUDIT.md`
- [x] `checkout_receiver_arming_fix` - status: completed_local_validated - source: `.swimpay-agent/CHECKOUT_RECEIVER_ARMING_FIX_REPORT.md`
- [x] `review_creation_path_proof` - status: completed_partial_latest_session_not_eligible - source: `.swimpay-agent/CHECKOUT_REVIEW_CREATION_PROOF_REPORT.md`
- [x] `secret_rotation_audit` - status: completed_rotation_required - source: `.swimpay-agent/SECRET_ROTATION_REQUIRED_REPORT.md`
- [ ] `webhook_e2e_after_arming_fix` - status: blocked_by_session_progression_and_redeploy - source: `.swimpay-agent/WEBHOOK_E2E_REHEARSAL_AFTER_ARMING_FIX.md`
- [x] `return_target_ux_status` - status: completed_with_findings - source: `.swimpay-agent/RETURN_TARGET_UX_STATUS_REPORT.md`
- [x] `runtime_blocker_closeout` - status: completed - source: `.swimpay-agent/CHECKOUT_RUNTIME_BLOCKER_CLOSEOUT.md`

The runner may prepare only one pending task at a time.

If a task file exists in `tasks/`, it can be prepared. If the root task file is missing, it is marked `missing` and is not automatic.

## Queue

Current follow-up is CHECKOUT-RETURN-URL-AND-FULFILLMENT-WEBHOOK. It separates buyer return UX from backend merchant fulfillment.

- [x] `return_url_contract_audit` - status: completed_with_findings - source: `.swimpay-agent/CHECKOUT_RETURN_URL_AUDIT.md`
- [x] `return_url_persistence_and_checkout_status` - status: completed_targeted_validated - source: `.swimpay-agent/CHECKOUT_RETURN_URL_FIX_REPORT.md`
- [x] `final_webhook_fulfillment_payload` - status: completed_targeted_validated - source: `.swimpay-agent/EXTERNAL_FULFILLMENT_WEBHOOK_AUDIT.md`
- [ ] `staging_external_app_fulfillment_rehearsal` - status: pending_redeploy_migration_and_external_webhook_receiver - source: `.swimpay-agent/EXTERNAL_FULFILLMENT_WEBHOOK_REHEARSAL_REPORT.md`

## Previous Queue

Current follow-up is CHECKOUT-RETURN-TO-MERCHANT-APP. It makes the confirmed checkout return to the Android app that opened the hosted checkout.

- [x] `checkout_return_path_audit` - status: completed_with_findings - source: `.swimpay-agent/CHECKOUT_RETURN_TO_MERCHANT_REPORT.md`
- [x] `android_sdk_return_scheme_handoff` - status: completed_targeted_validated - source: `.swimpay-agent/CHECKOUT_RETURN_TO_MERCHANT_REPORT.md`
- [x] `hosted_checkout_confirmed_return_link` - status: completed_targeted_validated - source: `.swimpay-agent/CHECKOUT_RETURN_TO_MERCHANT_REPORT.md`
- [ ] `staging_external_app_return_smoke` - status: pending_redeploy_and_external_app_rebuild - source: `.swimpay-agent/CHECKOUT_RETURN_TO_MERCHANT_REPORT.md`

## Previous Queue

The current sprint is CHECKOUT-FINAL-STATE-PROPAGATION. It ensures merchant manual decisions propagate to the hosted buyer checkout waiting screen.

- [x] `checkout_final_state_audit` - status: completed_with_findings - source: `.swimpay-agent/CHECKOUT_FINAL_STATE_PROPAGATION_AUDIT.md`
- [x] `buyer_checkout_status_contract` - status: completed_targeted_validated - source: `.swimpay-agent/BUYER_CHECKOUT_STATUS_CONTRACT_REPORT.md`
- [x] `hosted_checkout_status_polling` - status: completed_targeted_validated - source: `.swimpay-agent/CHECKOUT_FINAL_STATE_FIX_REPORT.md`
- [x] `checkout_final_state_tests` - status: completed_targeted_validated - source: `.swimpay-agent/CHECKOUT_FINAL_STATE_TEST_REPORT.md`
- [ ] `staging_external_checkout_confirmation_smoke` - status: pending_redeploy_and_device_test - source: `.swimpay-agent/CHECKOUT_FINAL_STATE_PROPAGATION_CLOSEOUT.md`

## Previous Queue

The current visual follow-up is OZON-BANK-RUNTIME-VERIFIED + BANK-LOGO-VISIBILITY.

- [x] `remove_false_visual_blockers` - status: completed - source: `.swimpay-agent/BLOCKERS.md`
- [x] `android_goldens_receiving_methods` - status: completed_verified - source: `.swimpay-agent/ANDROID_GOLDEN_SCREENSHOT_TEST_REPORT.md`
- [x] `android_goldens_developer_integration` - status: completed_verified - source: `.swimpay-agent/ANDROID_GOLDEN_SCREENSHOT_TEST_REPORT.md`
- [x] `android_goldens_confirmation_mode` - status: completed_verified - source: `.swimpay-agent/ANDROID_GOLDEN_SCREENSHOT_TEST_REPORT.md`
- [x] `ozon_bank_runtime_verified_contract` - status: completed_targeted_validated - source: `.swimpay-agent/OZON_BANK_RUNTIME_VERIFIED_REPORT.md`
- [x] `bank_logo_visibility_checkout_android` - status: completed_targeted_validated - source: `.swimpay-agent/BANK_LOGO_VISIBILITY_REPORT.md`
- [ ] `staging_apply_021_and_smoke` - status: pending_operator_vps_migration - source: `.swimpay-agent/NEXT_ACTION.md`

## Previous Queue

The current sprint is MERCHANT-INTELLIGENCE-7. It stabilizes Android merchant notification listening, Receiver health, redacted local observations, no-notification fallback reviews and merchant action notifications.

- [x] `merchant_intelligence_audit` - status: completed_with_findings - source: `.swimpay-agent/MERCHANT_INTELLIGENCE_AUDIT.md`
- [x] `receiver_health_gate` - status: completed_targeted_validated - source: `.swimpay-agent/MERCHANT_INTELLIGENCE_IMPLEMENTATION_REPORT.md`
- [x] `active_intent_sweep_guardrails` - status: completed_targeted_validated - source: `.swimpay-agent/MERCHANT_INTELLIGENCE_IMPLEMENTATION_REPORT.md`
- [x] `redacted_recent_buffer` - status: completed_targeted_validated - source: `.swimpay-agent/MERCHANT_INTELLIGENCE_IMPLEMENTATION_REPORT.md`
- [x] `fallback_review_merchant_notification` - status: completed_targeted_validated - source: `.swimpay-agent/MERCHANT_INTELLIGENCE_IMPLEMENTATION_REPORT.md`
- [x] `merchant_review_safe_signal_ui` - status: confirmed_existing_and_label_wired - source: `.swimpay-agent/MERCHANT_INTELLIGENCE_CODE_REVIEW.md`
- [x] `full_validation` - status: completed_validated - source: `.swimpay-agent/MERCHANT_INTELLIGENCE_CODE_REVIEW.md`
- [ ] `adb_smoke` - status: blocked_no_attached_device - source: `.swimpay-agent/MERCHANT_INTELLIGENCE_CODE_REVIEW.md`

## Previous Queue

The current hotfix is CHECKOUT-EXTERNAL-FLOW-REPAIR. It reconciles staging schema dependencies and external app error handling after the checkout business-logic refactors.

- [x] `checkout_external_breakage_audit` - status: completed_with_findings - source: `.swimpay-agent/CHECKOUT_EXTERNAL_APP_BREAKAGE_AUDIT.md`
- [x] `staging_migration_reconciliation` - status: completed_local_migration_created - source: `.swimpay-agent/STAGING_MIGRATION_RECONCILIATION_REPORT.md`
- [x] `external_app_sdk_error_rendering` - status: completed_validated - source: `.swimpay-agent/CHECKOUT_EXTERNAL_FLOW_REPAIR_REPORT.md`
- [ ] `staging_sdk_order_rehearsal` - status: blocked_waiting_for_staging_secret_and_vps_migration - source: `.swimpay-agent/CHECKOUT_EXTERNAL_FLOW_REPAIR_REPORT.md`

## Previous Queue

The previous addendum was MERCHANT-READINESS-GATE. It prevents a merchant with no active checkout-safe receiving route from being considered payment-ready.

- [x] `merchant_readiness_contract` - status: completed_validated - source: `.swimpay-agent/MERCHANT_READINESS_GATE_REPORT.md`
- [x] `merchant_order_creation_gate` - status: completed_validated - source: `.swimpay-agent/MERCHANT_READINESS_GATE_REPORT.md`
- [x] `android_dashboard_readiness_state` - status: completed_validated - source: `.swimpay-agent/MERCHANT_READINESS_GATE_REPORT.md`
- [x] `web_dashboard_readiness_state` - status: completed_validated - source: `.swimpay-agent/MERCHANT_READINESS_GATE_REPORT.md`
- [x] `sdk_setup_error_guardrail` - status: completed_validated - source: `.swimpay-agent/MERCHANT_READINESS_GATE_REPORT.md`

## Previous Queue

The previous sprint was PAYMENT-COMPATIBILITY-PAIR. It separates buyer sender bank, merchant receiver route, payer launcher and checkout fallback behavior.

- [x] `payment_compatibility_pair_audit` - status: completed_with_findings - source: `.swimpay-agent/PAYMENT_COMPATIBILITY_PAIR_AUDIT.md`
- [x] `payment_compatibility_pair_contract` - status: completed_validated - source: `.swimpay-agent/PAYMENT_COMPATIBILITY_PAIR_CONTRACT_REPORT.md`
- [x] `payment_compatibility_backend_refactor` - status: completed_validated - source: `.swimpay-agent/PAYMENT_COMPATIBILITY_BACKEND_REFACTOR_REPORT.md`
- [x] `payment_compatibility_fallback_matrix` - status: completed_validated - source: `.swimpay-agent/PAYMENT_COMPATIBILITY_FALLBACK_MATRIX_REPORT.md`
- [x] `checkout_structured_error_handling` - status: completed_validated - source: `.swimpay-agent/CHECKOUT_STRUCTURED_ERROR_HANDLING_REPORT.md`
- [x] `payment_compatibility_closeout` - status: completed_validated - source: `.swimpay-agent/PAYMENT_COMPATIBILITY_CLOSEOUT.md`

## Previous Queue

The current hotfix is CHECKOUT-METHOD-AVAILABILITY. It prevents buyers from seeing or forcing payment methods the merchant cannot receive.

- [x] `checkout_method_availability_audit` - status: completed_with_findings - source: `.swimpay-agent/CHECKOUT_METHOD_AVAILABILITY_AUDIT.md`
- [x] `checkout_backend_availability_contract` - status: completed_targeted_validated - source: `.swimpay-agent/CHECKOUT_METHOD_AVAILABILITY_FIX_REPORT.md`
- [x] `checkout_actionable_method_fallback` - status: completed_targeted_validated - source: `.swimpay-agent/CHECKOUT_METHOD_FALLBACK_UX_REPORT.md`

## Previous Queue

The current sprint is P0-WIRE-1. It wires the P0 database foundations into runtime behavior without changing manual-confirmation-only semantics.

- [x] `p0_wire_amount_lease_allocation` - status: completed_validated - source: `.swimpay-agent/P0_WIRE_AMOUNT_LEASE_REPORT.md`
- [x] `p0_wire_bank_certification_gates` - status: completed_validated - source: `.swimpay-agent/P0_WIRE_BANK_CERTIFICATION_REPORT.md`
- [x] `p0_wire_worker_idempotency_ledger` - status: completed_validated - source: `.swimpay-agent/P0_WIRE_WORKER_IDEMPOTENCY_REPORT.md`
- [x] `p0_wire_full_validation_and_closeout` - status: completed_validated - source: `.swimpay-agent/P0_WIRE_CLOSEOUT.md`

## Previous Queue

The previous sprint was EXTERNAL-P0-DELTA. It audited external P0 recommendations and implemented missing critical guardrails without applying a PAN Kill Switch or changing manual-confirmation-only semantics.

- [x] `external_p0_recommendations_audit` - status: completed_with_findings - source: `.swimpay-agent/EXTERNAL_P0_RECOMMENDATIONS_AUDIT.md`
- [x] `pan_sensitive_boundary_guardrails` - status: completed - source: `.swimpay-agent/PAN_SENSITIVE_BOUNDARY_REPORT.md`
- [x] `p0_evidence_envelope` - status: completed - source: `.swimpay-agent/P0_EVIDENCE_ENVELOPE_REPORT.md`
- [x] `p0_confidence_vector` - status: completed_backend_core - source: `.swimpay-agent/P0_CONFIDENCE_VECTOR_REPORT.md`
- [x] `p0_amount_lease_engine` - status: completed_schema_runtime_wiring_done_in_p0_wire_1 - source: `.swimpay-agent/P0_AMOUNT_LEASE_REPORT.md`
- [x] `p0_collision_pressure_meter` - status: completed - source: `.swimpay-agent/P0_COLLISION_PRESSURE_REPORT.md`
- [x] `p0_receiver_health_gate` - status: completed_contract_checkout_adaptation_pending - source: `.swimpay-agent/P0_RECEIVER_HEALTH_GATE_REPORT.md`
- [x] `p0_bank_certification_matrix` - status: completed_schema_runtime_wiring_done_in_p0_wire_1 - source: `.swimpay-agent/P0_BANK_CERTIFICATION_MATRIX_REPORT.md`
- [x] `p0_replay_lab` - status: completed_initial_scripts - source: `.swimpay-agent/P0_REPLAY_LAB_REPORT.md`
- [x] `p0_closeout` - status: completed_validated - source: `.swimpay-agent/P0_CLOSEOUT.md`

## Previous Queue

The previous sprint was CHECKOUT-UX-REFLOW. It refactors the hosted buyer checkout into a mobile-first Apple-like guided flow without changing payment runtime semantics.

- [x] `731_checkout_ux_refactor_audit` - status: completed_with_findings - source: `tasks/731_checkout_ux_refactor_audit.md`
- [x] `732_checkout_ux_design_plan` - status: completed - source: `tasks/732_checkout_ux_design_plan.md`
- [x] `733_checkout_flow_shell_and_stepper` - status: completed - source: `tasks/733_checkout_flow_shell_and_stepper.md`
- [x] `734_checkout_buyer_info_method_ui` - status: completed - source: `tasks/734_checkout_buyer_info_method_ui.md`
- [x] `735_checkout_instructions_copy_waiting_ui` - status: completed - source: `tasks/735_checkout_instructions_copy_waiting_ui.md`
- [x] `736_checkout_ux_guardrails_tests` - status: completed - source: `tasks/736_checkout_ux_guardrails_tests.md`
- [x] `737_checkout_ux_closeout` - status: completed - source: `tasks/737_checkout_ux_closeout.md`

## Next Planned Queue

The next planned sprint is DEVELOPER-LINK-VERIFY. It turns Developer Integration "test" into a real merchant-to-external-app/web liaison proof and hardens API key/webhook secret revocation.

- [ ] `725_developer_link_verification_inventory` - status: pending - source: `tasks/725_developer_link_verification_inventory.md`
- [ ] `726_webhook_liaison_test_contract` - status: pending - source: `tasks/726_webhook_liaison_test_contract.md`
- [ ] `727_integration_secret_revocation_lifecycle` - status: pending - source: `tasks/727_integration_secret_revocation_lifecycle.md`
- [ ] `728_android_developer_integration_liaison_ui` - status: pending - source: `tasks/728_android_developer_integration_liaison_ui.md`
- [ ] `729_developer_link_guardrails_tests` - status: pending - source: `tasks/729_developer_link_guardrails_tests.md`
- [ ] `730_developer_link_closeout` - status: pending - source: `tasks/730_developer_link_closeout.md`

## Previous Queue

The previous sprint was BUYER-CHECKOUT-4STEP. It aligns hosted buyer checkout, expected payment profile, bank launcher fallbacks and Intelligence matching without processing real bank notifications.

- [x] `710_buyer_checkout_current_flow_audit` - status: completed_with_findings - source: `tasks/710_buyer_checkout_current_flow_audit.md`
- [x] `711_expected_payment_profile_contract` - status: completed - source: `tasks/711_expected_payment_profile_contract.md`
- [x] `712_buyer_identity_normalization_engine` - status: completed - source: `tasks/712_buyer_identity_normalization_engine.md`
- [x] `713_checkout_step1_buyer_identity_method` - status: completed - source: `tasks/713_checkout_step1_buyer_identity_method.md`
- [x] `714_checkout_step2_exact_instructions` - status: completed - source: `tasks/714_checkout_step2_exact_instructions.md`
- [x] `715_bank_launcher_deeplink_registry` - status: completed_with_native_android_launcher_pending - source: `tasks/715_bank_launcher_deeplink_registry.md`
- [x] `716_checkout_step3_open_bank` - status: completed_web_fallback_only - source: `tasks/716_checkout_step3_open_bank.md`
- [x] `717_checkout_step4_paid_claim_waiting` - status: completed - source: `tasks/717_checkout_step4_paid_claim_waiting.md`
- [x] `718_swimpay_intelligence_expected_profile_matching` - status: completed_backend_wiring_added - source: `tasks/718_swimpay_intelligence_expected_profile_matching.md`
- [x] `721_active_intent_notification_sweep` - status: completed - source: `tasks/721_active_intent_notification_sweep.md`
- [x] `722_no_notification_manual_fallback` - status: completed - source: `tasks/722_no_notification_manual_fallback.md`
- [x] `723_real_world_bank_template_variants` - status: completed - source: `tasks/723_real_world_bank_template_variants.md`
- [x] `724_ozon_bank_manager_integration` - status: completed_package_validation_pending - source: `tasks/724_ozon_bank_manager_integration.md`
- [x] `719_buyer_checkout_security_guardrails` - status: completed - source: `tasks/719_buyer_checkout_security_guardrails.md`
- [x] `720_buyer_checkout_4_step_closeout` - status: completed - source: `tasks/720_buyer_checkout_4_step_closeout.md`

## Previous Queue

The previous sprint was HARDEN-REAL-1. It fixed code-quality blockers before real notification testing.

- [x] `706_harden_real_signal_runtime` - status: completed - source: `tasks/706_harden_real_signal_runtime.md`
- [x] `707_harden_backend_prod_auth_and_secrets` - status: completed - source: `tasks/707_harden_backend_prod_auth_and_secrets.md`
- [x] `708_harden_android_device_redaction_and_exports` - status: completed - source: `tasks/708_harden_android_device_redaction_and_exports.md`
- [x] `709_harden_webhook_delivery_and_ci` - status: completed - source: `tasks/709_harden_webhook_delivery_and_ci.md`

## Previous Queue

The previous sprint was Android dashboard metrics wiring. It is not a payment runtime, Receiver capture or SDK/webhook rehearsal sprint.

- [x] `698_metrics_inventory` - status: completed - source: `tasks/698_metrics_inventory.md`
- [x] `699_backend_metrics_summary` - status: completed - source: `tasks/699_backend_metrics_summary.md`
- [x] `700_backend_metrics_timeseries` - status: completed - source: `tasks/700_backend_metrics_timeseries.md`
- [x] `701_android_dashboard_cards_wiring` - status: completed - source: `tasks/701_android_dashboard_cards_wiring.md`
- [x] `702_android_compact_chart_wiring` - status: completed - source: `tasks/702_android_compact_chart_wiring.md`
- [x] `703_review_screen_metrics_wiring` - status: completed - source: `tasks/703_review_screen_metrics_wiring.md`
- [x] `704_metrics_guardrails` - status: completed - source: `tasks/704_metrics_guardrails.md`
- [x] `705_metrics_closeout` - status: completed - source: `tasks/705_metrics_closeout.md`

## Previous Queue

- [x] `687_android_subscreens_inventory` - status: completed - source: `tasks/687_android_subscreens_inventory.md`
- [x] `688_android_help_center_screen` - status: completed - source: `tasks/688_android_help_center_screen.md`
- [x] `689_android_contact_support_screen` - status: completed - source: `tasks/689_android_contact_support_screen.md`
- [x] `690_android_security_app_lock` - status: completed_with_device_walkthrough_pending - source: `tasks/690_android_security_app_lock.md`
- [x] `691_android_language_localization` - status: completed_with_global_string_migration_pending - source: `tasks/691_android_language_localization.md`
- [x] `692_android_appearance_theme_mode` - status: completed - source: `tasks/692_android_appearance_theme_mode.md`
- [x] `693_android_confirmation_mode_settings` - status: completed_future_ia_exclusion_preserved - source: `tasks/693_android_confirmation_mode_settings.md`
- [x] `694_backend_settings_support_contracts` - status: completed - source: `tasks/694_backend_settings_support_contracts.md`
- [x] `695_android_subscreens_navigation_integration` - status: completed - source: `tasks/695_android_subscreens_navigation_integration.md`
- [x] `696_android_subscreens_guardrails_tests` - status: completed - source: `tasks/696_android_subscreens_guardrails_tests.md`
- [x] `697_android_subscreens_closeout` - status: completed - source: `tasks/697_android_subscreens_closeout.md`

## Previous Queue

- [x] `656_receiver_signing_inventory` - status: completed - source: `tasks/656_receiver_signing_inventory.md`
- [x] `657_android_keystore_keypair_generation` - status: completed - source: `tasks/657_android_keystore_keypair_generation.md`
- [x] `658_receiver_public_key_registration_contract` - status: completed - source: `tasks/658_receiver_public_key_registration_contract.md`
- [x] `659_asymmetric_signal_envelope_signing` - status: completed - source: `tasks/659_asymmetric_signal_envelope_signing.md`
- [x] `660_backend_public_key_signature_verification` - status: completed - source: `tasks/660_backend_public_key_signature_verification.md`
- [x] `661_receiver_signing_migration_compatibility` - status: completed_with_reregistration_required - source: `tasks/661_receiver_signing_migration_compatibility.md`
- [x] `662_receiver_signing_guardrails` - status: completed - source: `tasks/662_receiver_signing_guardrails.md`
- [x] `663_receiver_signing_staging_proof` - status: implementation_ready_staging_proof_pending - source: `tasks/663_receiver_signing_staging_proof.md`
- [x] `664_receiver_signing_closeout` - status: completed_with_external_staging_proof_pending - source: `tasks/664_receiver_signing_closeout.md`

## Previous Queue

- [x] `637_intelligence_tools_inventory` - status: completed_with_findings - source: `tasks/637_intelligence_tools_inventory.md`
- [x] `638_bank_target_lock_readiness` - status: completed_ready_with_device_metric_pending - source: `tasks/638_bank_target_lock_readiness.md`
- [x] `639_notification_listener_readiness` - status: completed_partial_device_state_pending - source: `tasks/639_notification_listener_readiness.md`
- [x] `640_redaction_outbox_upload_readiness` - status: completed_partial_staging_upload_pending - source: `tasks/640_redaction_outbox_upload_readiness.md`
- [x] `641_receiver_registration_heartbeat_readiness` - status: completed_partial_device_staging_pending - source: `tasks/641_receiver_registration_heartbeat_readiness.md`
- [x] `642_backend_signal_ingestion_readiness` - status: completed_ready_with_live_synthetic_pending - source: `tasks/642_backend_signal_ingestion_readiness.md`
- [x] `643_parser_shape_classifier_readiness` - status: completed_ready_with_real_shape_pending - source: `tasks/643_parser_shape_classifier_readiness.md`
- [x] `644_payment_intent_gate_review_readiness` - status: completed_ready_with_staging_e2e_pending - source: `tasks/644_payment_intent_gate_review_readiness.md`
- [x] `645_manual_confirmation_webhook_readiness` - status: completed_ready_with_external_staging_pending - source: `tasks/645_manual_confirmation_webhook_readiness.md`
- [x] `646_sdk_and_receiving_methods_readiness` - status: completed_ready_with_staging_rehearsal_pending - source: `tasks/646_sdk_and_receiving_methods_readiness.md`
- [x] `647_intelligence_tools_readiness_closeout` - status: completed_with_blockers - source: `tasks/647_intelligence_tools_readiness_closeout.md`

## Previous Queue

- [x] `635_real_capture_2_intelligence_tool_inventory` - status: completed_with_findings - source: `tasks/635_real_capture_2_intelligence_tool_inventory.md`
- [ ] `636_real_capture_2_bank_detection_device_metrics` - status: pending - source: `tasks/636_real_capture_2_bank_detection_device_metrics.md`
- [ ] `637_real_capture_2_receiver_auth_registration_heartbeat` - status: pending - source: `tasks/637_real_capture_2_receiver_auth_registration_heartbeat.md`
- [ ] `638_real_capture_2_notification_access_and_gate` - status: pending - source: `tasks/638_real_capture_2_notification_access_and_gate.md`
- [x] `639_real_capture_2_redaction_outbox_upload_smoke` - status: completed_synthetic_staging_upload_passed - source: `tasks/639_real_capture_2_redaction_outbox_upload_smoke.md`
- [ ] `640_real_capture_2_backend_intent_gate_metrics` - status: pending - source: `tasks/640_real_capture_2_backend_intent_gate_metrics.md`
- [ ] `641_real_capture_2_sdk_order_and_webhook_rehearsal` - status: pending - source: `tasks/641_real_capture_2_sdk_order_and_webhook_rehearsal.md`
- [ ] `642_real_capture_2_combined_synthetic_e2e_metrics` - status: pending - source: `tasks/642_real_capture_2_combined_synthetic_e2e_metrics.md`
- [ ] `643_real_capture_2_real_notification_capture_gate` - status: gated_not_started - source: `tasks/643_real_capture_2_real_notification_capture_gate.md`
- [ ] `644_real_capture_2_closeout` - status: pending - source: `tasks/644_real_capture_2_closeout.md`

## Previous Queue

- [x] `628_real_capture_1_inventory` - status: completed - source: `tasks/628_real_capture_1_inventory.md`
- [x] `629_android_staging_installable_non_debug_apk` - status: completed - source: `tasks/629_android_staging_installable_non_debug_apk.md`
- [x] `630_android_staging_login_onboarding_receiver_registration` - status: blocked_existing_device_state - source: `tasks/630_android_staging_login_onboarding_receiver_registration.md`
- [x] `631_staging_receiver_heartbeat_and_signal_upload_smoke` - status: blocked_until_receiver_webhook_configured - source: `tasks/631_staging_receiver_heartbeat_and_signal_upload_smoke.md`
- [ ] `632_real_notification_capture_operator_gate` - status: gated_not_started - source: `tasks/632_real_notification_capture_operator_gate.md`
- [ ] `633_manual_review_webhook_staging_proof` - status: blocked_until_safe_signal_and_manual_review - source: `tasks/633_manual_review_webhook_staging_proof.md`
- [x] `634_real_capture_1_closeout` - status: completed_with_blockers - source: `tasks/634_real_capture_1_closeout.md`

## Previous Queue

- [x] `623_android_non_debug_signal_upload_transport` - status: completed - source: `tasks/623_android_non_debug_signal_upload_transport.md`
- [x] `624_android_auth_login_onboarding_truth_hardening` - status: completed - source: `tasks/624_android_auth_login_onboarding_truth_hardening.md`
- [x] `625_admin_auto_confirm_vocabulary_neutralization` - status: completed - source: `tasks/625_admin_auto_confirm_vocabulary_neutralization.md`
- [x] `626_staging_prod_dev_surface_cleanup` - status: completed - source: `tasks/626_staging_prod_dev_surface_cleanup.md`
- [x] `627_staging_prod_hardening_closeout` - status: completed - source: `tasks/627_staging_prod_hardening_closeout.md`

## Previous Queue

- [x] `612_intelligence_source_of_truth_inventory` - status: completed_with_findings - source: `tasks/612_intelligence_source_of_truth_inventory.md`
- [x] `613_intelligence_tools_and_boundaries_map` - status: completed - source: `tasks/613_intelligence_tools_and_boundaries_map.md`
- [x] `614_android_receiver_truth_audit` - status: completed_with_must_fix_before_real_capture - source: `tasks/614_android_receiver_truth_audit.md`
- [x] `615_backend_signal_truth_audit` - status: completed_with_guardrail_fix - source: `tasks/615_backend_signal_truth_audit.md`
- [x] `616_runtime_payment_intent_truth_audit` - status: completed - source: `tasks/616_runtime_payment_intent_truth_audit.md`
- [x] `617_learning_monitoring_truth_audit` - status: completed - source: `tasks/617_learning_monitoring_truth_audit.md`
- [x] `618_webhook_event_taxonomy_truth_audit` - status: completed - source: `tasks/618_webhook_event_taxonomy_truth_audit.md`
- [x] `619_sdk_integration_truth_audit` - status: completed - source: `tasks/619_sdk_integration_truth_audit.md`
- [x] `620_admin_operator_surface_truth_audit` - status: completed_with_vocabulary_debt - source: `tasks/620_admin_operator_surface_truth_audit.md`
- [x] `621_intelligence_source_truth_guardrails` - status: completed - source: `tasks/621_intelligence_source_truth_guardrails.md`
- [x] `622_intelligence_source_truth_closeout` - status: completed - source: `tasks/622_intelligence_source_truth_closeout.md`

## Previous Queue

- [x] `601_real_staging_integration_inventory` - status: completed - source: `tasks/601_real_staging_integration_inventory.md`
- [x] `602_vps_domain_staging_deploy_plan` - status: completed - source: `tasks/602_vps_domain_staging_deploy_plan.md`
- [x] `603_env_secrets_and_oauth_staging` - status: completed - source: `tasks/603_env_secrets_and_oauth_staging.md`
- [x] `604_database_migration_and_seed_staging` - status: completed_blocked_external_staging - source: `tasks/604_database_migration_and_seed_staging.md`
- [x] `605_external_app_sdk_integration_real_staging` - status: completed_local_harness_ready - source: `tasks/605_external_app_sdk_integration_real_staging.md`
- [x] `606_google_oauth_live_staging_validation` - status: blocked_missing_external_credentials - source: `tasks/606_google_oauth_live_staging_validation.md`
- [x] `607_android_receiver_real_device_staging_setup` - status: completed_local_device_smoke_blocked_staging_registration - source: `tasks/607_android_receiver_real_device_staging_setup.md`
- [ ] `608_real_bank_notification_capture_test` - status: blocked_until_staging_ready_and_final_operator_capture_start - source: `tasks/608_real_bank_notification_capture_test.md`
- [ ] `609_manual_review_and_webhook_staging_flow` - status: blocked_until_staging_order_receiver_and_real_signal_exist - source: `tasks/609_manual_review_and_webhook_staging_flow.md`
- [ ] `610_real_staging_observability_and_logs` - status: blocked_until_staging_stack_runs - source: `tasks/610_real_staging_observability_and_logs.md`
- [x] `611_real_staging_integration_closeout` - status: completed_with_external_blockers - source: `tasks/611_real_staging_integration_closeout.md`

## Previous Queue

- [x] `585_android_receiver_real_runtime_inventory` - status: completed - source: `tasks/585_android_receiver_real_runtime_inventory.md`
- [x] `586_bank_target_lock_non_debug_runtime` - status: completed - source: `tasks/586_bank_target_lock_non_debug_runtime.md`
- [x] `587_notification_listener_redaction_path` - status: completed - source: `tasks/587_notification_listener_redaction_path.md`
- [x] `588_receiver_outbox_real_runtime_safety` - status: completed - source: `tasks/588_receiver_outbox_real_runtime_safety.md`
- [x] `589_receiver_staging_synthetic_notification_harness` - status: completed - source: `tasks/589_receiver_staging_synthetic_notification_harness.md`
- [x] `590_android_receiver_real_runtime_guardrails` - status: completed - source: `tasks/590_android_receiver_real_runtime_guardrails.md`
- [x] `591_android_receiver_real_runtime_closeout` - status: completed - source: `tasks/591_android_receiver_real_runtime_closeout.md`

## Previous Queue

- [x] `578_cr2_runtime_product_truth_inventory` - status: completed - source: `tasks/578_cr2_runtime_product_truth_inventory.md`
- [x] `579_signal_runtime_manual_only_gate` - status: completed - source: `tasks/579_signal_runtime_manual_only_gate.md`
- [x] `580_public_webhook_taxonomy_enforcement` - status: completed - source: `tasks/580_public_webhook_taxonomy_enforcement.md`
- [x] `581_cr2_product_truth_guardrails` - status: completed - source: `tasks/581_cr2_product_truth_guardrails.md`
- [x] `582_cr2_runtime_product_truth_closeout` - status: completed - source: `tasks/582_cr2_runtime_product_truth_closeout.md`

## Previous Queue

- [x] `566_full_code_review_inventory` - status: completed - source: `tasks/566_full_code_review_inventory.md`
- [x] `567_product_truth_consistency_audit` - status: completed - source: `tasks/567_product_truth_consistency_audit.md`
- [x] `568_auth_bff_and_tenant_isolation_audit` - status: completed - source: `tasks/568_auth_bff_and_tenant_isolation_audit.md`
- [x] `569_payment_intent_and_review_flow_audit` - status: completed - source: `tasks/569_payment_intent_and_review_flow_audit.md`
- [x] `570_receiver_intelligence_code_audit` - status: completed - source: `tasks/570_receiver_intelligence_code_audit.md`
- [x] `571_webhook_and_sdk_contract_audit` - status: completed - source: `tasks/571_webhook_and_sdk_contract_audit.md`
- [x] `572_android_receiver_and_ui_audit` - status: completed - source: `tasks/572_android_receiver_and_ui_audit.md`
- [x] `573_database_migrations_and_data_integrity_audit` - status: completed - source: `tasks/573_database_migrations_and_data_integrity_audit.md`
- [x] `574_security_privacy_and_secret_handling_audit` - status: completed - source: `tasks/574_security_privacy_and_secret_handling_audit.md`
- [x] `575_vps_deployment_readiness_audit` - status: completed - source: `tasks/575_vps_deployment_readiness_audit.md`
- [x] `576_test_coverage_and_quality_gates_audit` - status: completed - source: `tasks/576_test_coverage_and_quality_gates_audit.md`
- [x] `577_full_code_review_closeout` - status: completed - source: `tasks/577_full_code_review_closeout.md`

## Previous Queue

- [x] `546_prod_mode_staging_inventory` - status: completed - source: `tasks/546_prod_mode_staging_inventory.md`
- [x] `547_prod_env_and_secret_contract` - status: completed - source: `tasks/547_prod_env_and_secret_contract.md`
- [x] `548_seed_staging_identity_data` - status: completed - source: `tasks/548_seed_staging_identity_data.md`
- [x] `549_prod_bff_session_csrf_validation` - status: completed - source: `tasks/549_prod_bff_session_csrf_validation.md`
- [x] `550_prod_sdk_api_key_validation` - status: completed - source: `tasks/550_prod_sdk_api_key_validation.md`
- [x] `551_prod_receiver_registration_heartbeat_validation` - status: completed - source: `tasks/551_prod_receiver_registration_heartbeat_validation.md`
- [x] `552_prod_signal_upload_validation` - status: completed - source: `tasks/552_prod_signal_upload_validation.md`
- [x] `553_prod_webhook_semantics_validation` - status: completed - source: `tasks/553_prod_webhook_semantics_validation.md`
- [x] `554_vps_staging_readiness_audit` - status: completed - source: `tasks/554_vps_staging_readiness_audit.md`
- [x] `555_prod_mode_staging_closeout` - status: completed - source: `tasks/555_prod_mode_staging_closeout.md`

## Previous Queue

- [x] `535_auth_bff_inventory` - status: completed - source: `tasks/535_auth_bff_inventory.md`
- [x] `536_identity_schema_and_migrations` - status: completed - source: `tasks/536_identity_schema_and_migrations.md`
- [x] `537_google_oauth_bff_provider_seam` - status: completed - source: `tasks/537_google_oauth_bff_provider_seam.md`
- [x] `538_bff_session_cookie_lifecycle` - status: completed - source: `tasks/538_bff_session_cookie_lifecycle.md`
- [x] `539_merchant_membership_roles_permissions` - status: completed - source: `tasks/539_merchant_membership_roles_permissions.md`
- [x] `540_active_merchant_context_and_tenant_isolation` - status: completed - source: `tasks/540_active_merchant_context_and_tenant_isolation.md`
- [x] `541_csrf_for_merchant_post_forms` - status: completed - source: `tasks/541_csrf_for_merchant_post_forms.md`
- [x] `542_api_key_verification_against_stored_keys` - status: completed - source: `tasks/542_api_key_verification_against_stored_keys.md`
- [x] `543_admin_role_boundary` - status: completed - source: `tasks/543_admin_role_boundary.md`
- [x] `544_auth_bff_guardrails` - status: completed - source: `tasks/544_auth_bff_guardrails.md`
- [x] `545_auth_bff_closeout` - status: completed - source: `tasks/545_auth_bff_closeout.md`

## Previous Queue

- [x] `525_receiver_intelligence_prod_inventory` - status: completed - source: `tasks/525_receiver_intelligence_prod_inventory.md`
- [x] `526_receiver_device_key_lifecycle_hardening` - status: completed - source: `tasks/526_receiver_device_key_lifecycle_hardening.md`
- [x] `527_receiver_registration_and_session_hardening` - status: completed - source: `tasks/527_receiver_registration_and_session_hardening.md`
- [x] `528_signal_upload_antireplay_outbox_hardening` - status: completed - source: `tasks/528_signal_upload_antireplay_outbox_hardening.md`
- [x] `529_payment_intent_runtime_safety_audit` - status: completed - source: `tasks/529_payment_intent_runtime_safety_audit.md`
- [x] `530_five_bank_production_fixture_validation` - status: completed - source: `tasks/530_five_bank_production_fixture_validation.md`
- [x] `531_receiver_health_and_operational_states` - status: completed - source: `tasks/531_receiver_health_and_operational_states.md`
- [x] `532_intelligence_retention_policy_hooks` - status: completed - source: `tasks/532_intelligence_retention_policy_hooks.md`
- [x] `533_receiver_intelligence_guardrails` - status: completed - source: `tasks/533_receiver_intelligence_guardrails.md`
- [x] `534_receiver_intelligence_prod_closeout` - status: completed - source: `tasks/534_receiver_intelligence_prod_closeout.md`

## Previous Queue

- [x] `519_developer_wizard_auth_inventory` - status: completed - source: `tasks/519_developer_wizard_auth_inventory.md`
- [x] `520_web_merchant_session_boundary` - status: completed - source: `tasks/520_web_merchant_session_boundary.md`
- [x] `521_production_no_dev_bearer_guard` - status: completed - source: `tasks/521_production_no_dev_bearer_guard.md`
- [x] `522_developer_wizard_auth_required_state` - status: completed - source: `tasks/522_developer_wizard_auth_required_state.md`
- [x] `523_developer_wizard_browser_qa` - status: completed - source: `tasks/523_developer_wizard_browser_qa.md`
- [x] `524_developer_wizard_auth_guardrails` - status: completed - source: `tasks/524_developer_wizard_auth_guardrails.md`
- [x] `525_developer_wizard_auth_closeout` - status: completed - source: `tasks/525_developer_wizard_auth_closeout.md`
## Previous Queue

- [x] `512_developer_wizard_live_inventory` - status: completed - source: `tasks/512_developer_wizard_live_inventory.md`
- [x] `513_merchant_integration_web_client` - status: completed - source: `tasks/513_merchant_integration_web_client.md`
- [x] `514_developer_wizard_live_credentials` - status: completed - source: `tasks/514_developer_wizard_live_credentials.md`
- [x] `515_developer_wizard_webhook_actions` - status: completed - source: `tasks/515_developer_wizard_webhook_actions.md`
- [x] `516_developer_wizard_live_guardrails` - status: completed - source: `tasks/516_developer_wizard_live_guardrails.md`
- [x] `517_developer_wizard_live_docs` - status: completed - source: `tasks/517_developer_wizard_live_docs.md`
- [x] `518_developer_wizard_live_closeout` - status: completed - source: `tasks/518_developer_wizard_live_closeout.md`

## Previous Queue

- [x] `502_developer_integration_backend_inventory` - status: completed - source: `tasks/502_developer_integration_backend_inventory.md`
- [x] `503_merchant_integration_credentials_model` - status: completed - source: `tasks/503_merchant_integration_credentials_model.md`
- [x] `504_api_key_public_key_lifecycle` - status: completed - source: `tasks/504_api_key_public_key_lifecycle.md`
- [x] `505_webhook_secret_lifecycle` - status: completed - source: `tasks/505_webhook_secret_lifecycle.md`
- [x] `506_webhook_url_save_update` - status: completed - source: `tasks/506_webhook_url_save_update.md`
- [x] `507_merchant_scoped_delivery_history` - status: completed - source: `tasks/507_merchant_scoped_delivery_history.md`
- [x] `508_webhook_test_and_retry_backend` - status: completed - source: `tasks/508_webhook_test_and_retry_backend.md`
- [x] `509_wizard_backend_wiring` - status: completed - source: `tasks/509_wizard_backend_wiring.md`
- [x] `510_developer_backend_guardrails` - status: completed - source: `tasks/510_developer_backend_guardrails.md`
- [x] `511_developer_backend_lifecycle_closeout` - status: completed - source: `tasks/511_developer_backend_lifecycle_closeout.md`

- [x] `494_developer_wizard_inventory` - status: completed - source: `tasks/494_developer_wizard_inventory.md`
- [x] `495_integration_type_selector` - status: completed - source: `tasks/495_integration_type_selector.md`
- [x] `496_credentials_webhook_config` - status: completed - source: `tasks/496_credentials_webhook_config.md`
- [x] `497_web_sdk_snippets_surface` - status: completed - source: `tasks/497_web_sdk_snippets_surface.md`
- [x] `498_android_sdk_snippets_surface` - status: completed - source: `tasks/498_android_sdk_snippets_surface.md`
- [x] `499_webhook_test_and_delivery_history` - status: completed - source: `tasks/499_webhook_test_and_delivery_history.md`
- [x] `500_developer_wizard_guardrails` - status: completed - source: `tasks/500_developer_wizard_guardrails.md`
- [x] `501_developer_wizard_closeout` - status: completed - source: `tasks/501_developer_wizard_closeout.md`

- [x] `486_sdk_android_package_inventory` - status: completed - source: `tasks/486_sdk_android_package_inventory.md`
- [x] `487_swimpay_android_checkout_helper` - status: completed - source: `tasks/487_swimpay_android_checkout_helper.md`
- [x] `488_android_checkout_return_handling` - status: completed - source: `tasks/488_android_checkout_return_handling.md`
- [x] `489_android_sdk_errors_and_models` - status: completed - source: `tasks/489_android_sdk_errors_and_models.md`
- [x] `490_android_sdk_receiver_separation_guardrails` - status: completed - source: `tasks/490_android_sdk_receiver_separation_guardrails.md`
- [x] `491_android_sdk_quickstart_examples` - status: completed - source: `tasks/491_android_sdk_quickstart_examples.md`
- [x] `492_android_sdk_product_truth_guardrails` - status: completed - source: `tasks/492_android_sdk_product_truth_guardrails.md`
- [x] `493_android_sdk_closeout` - status: completed - source: `tasks/493_android_sdk_closeout.md`

- [x] `476_sdk_web_package_inventory` - status: completed - source: `tasks/476_sdk_web_package_inventory.md`
- [x] `477_swimpay_node_sdk_client` - status: completed - source: `tasks/477_swimpay_node_sdk_client.md`
- [x] `478_swimpay_node_orders_create` - status: completed - source: `tasks/478_swimpay_node_orders_create.md`
- [x] `479_swimpay_webhook_verifier` - status: completed - source: `tasks/479_swimpay_webhook_verifier.md`
- [x] `480_swimpay_public_webhook_types` - status: completed - source: `tasks/480_swimpay_public_webhook_types.md`
- [x] `481_swimpay_sdk_errors_idempotency` - status: completed - source: `tasks/481_swimpay_sdk_errors_idempotency.md`
- [x] `482_swimpay_web_helper_or_snippets` - status: completed - source: `tasks/482_swimpay_web_helper_or_snippets.md`
- [x] `483_sdk_web_quickstart_examples` - status: completed - source: `tasks/483_sdk_web_quickstart_examples.md`
- [x] `484_sdk_web_product_truth_guardrails` - status: completed - source: `tasks/484_sdk_web_product_truth_guardrails.md`
- [x] `485_sdk_web_closeout` - status: completed - source: `tasks/485_sdk_web_closeout.md`

- [x] `469_product_truth_public_event_taxonomy` - status: completed - source: `tasks/469_product_truth_public_event_taxonomy.md`
- [x] `470_api_spec_payment_intent_alignment` - status: completed - source: `tasks/470_api_spec_payment_intent_alignment.md`
- [x] `471_runtime_docs_manual_confirm_v1` - status: completed - source: `tasks/471_runtime_docs_manual_confirm_v1.md`
- [x] `472_product_truth_guardrail_tests` - status: completed - source: `tasks/472_product_truth_guardrail_tests.md`
- [x] `473_product_truth_cleanup_closeout` - status: completed - source: `tasks/473_product_truth_cleanup_closeout.md`

- [x] `460_sdk_receiver_prod_readiness_inventory` - status: completed - source: `tasks/460_sdk_receiver_prod_readiness_inventory.md`
- [x] `461_sdk_web_current_state_audit` - status: completed - source: `tasks/461_sdk_web_current_state_audit.md`
- [x] `462_sdk_android_current_state_audit` - status: completed - source: `tasks/462_sdk_android_current_state_audit.md`
- [x] `463_developer_integration_wizard_audit` - status: completed - source: `tasks/463_developer_integration_wizard_audit.md`
- [x] `464_receiver_intelligence_prod_readiness_audit` - status: completed - source: `tasks/464_receiver_intelligence_prod_readiness_audit.md`
- [x] `465_secondary_surfaces_hydration_audit` - status: completed - source: `tasks/465_secondary_surfaces_hydration_audit.md`
- [x] `466_product_truth_contradiction_audit` - status: completed - source: `tasks/466_product_truth_contradiction_audit.md`
- [x] `467_vps_production_readiness_audit` - status: completed - source: `tasks/467_vps_production_readiness_audit.md`
- [x] `468_prod_readiness_audit_closeout` - status: completed - source: `tasks/468_prod_readiness_audit_closeout.md`

- [x] `460_intelligence_persistence_gap_audit` - status: completed - source: `tasks/460_intelligence_persistence_gap_audit.md`
- [x] `461_durable_intelligence_feedback_storage` - status: completed - source: `tasks/461_durable_intelligence_feedback_storage.md`
- [x] `462_intelligence_repository_and_apis` - status: completed - source: `tasks/462_intelligence_repository_and_apis.md`
- [x] `463_operator_intelligence_readonly_surfaces` - status: completed - source: `tasks/463_operator_intelligence_readonly_surfaces.md`
- [x] `464_intent_bound_learning_contract_guardrails` - status: completed - source: `tasks/464_intent_bound_learning_contract_guardrails.md`
- [x] `465_intelligence_persistence_readonly_tests` - status: completed - source: `tasks/465_intelligence_persistence_readonly_tests.md`
- [x] `466_sprint_8c_intelligence_persistence_closeout` - status: completed - source: `tasks/466_sprint_8c_intelligence_persistence_closeout.md`

- [x] `450_swimpay_intelligence_gap_audit` - status: completed - source: `tasks/450_swimpay_intelligence_gap_audit.md`
- [x] `451_buyer_checkout_recognition_hints` - status: completed - source: `tasks/451_buyer_checkout_recognition_hints.md`
- [x] `452_payment_intent_builder_reconciliation_amount` - status: completed - source: `tasks/452_payment_intent_builder_reconciliation_amount.md`
- [x] `453_receiver_armed_bank_launcher_flow` - status: completed - source: `tasks/453_receiver_armed_bank_launcher_flow.md`
- [x] `454_payment_intent_gate_model` - status: completed - source: `tasks/454_payment_intent_gate_model.md`
- [x] `455_payment_intent_gate_runtime_integration` - status: completed - source: `tasks/455_payment_intent_gate_runtime_integration.md`
- [x] `456_merchant_review_matching_copy` - status: completed - source: `tasks/456_merchant_review_matching_copy.md`
- [x] `457_intent_bound_passive_learning_context` - status: completed - source: `tasks/457_intent_bound_passive_learning_context.md`
- [x] `458_payment_intent_fraud_error_guard_tests` - status: completed - source: `tasks/458_payment_intent_fraud_error_guard_tests.md`
- [x] `459_sprint_8b_payment_intent_bound_closeout` - status: completed - source: `tasks/459_sprint_8b_payment_intent_bound_closeout.md`

- [x] `439_android_bank_notification_agent_v1_model` - status: completed - source: `tasks/439_android_bank_notification_agent_v1_model.md`
- [x] `440_android_direction_aware_shape_hasher` - status: completed - source: `tasks/440_android_direction_aware_shape_hasher.md`
- [x] `441_static_bank_profile_distribution` - status: completed - source: `tasks/441_static_bank_profile_distribution.md`
- [x] `442_android_deterministic_parser_classifier` - status: completed - source: `tasks/442_android_deterministic_parser_classifier.md`
- [x] `443_redacted_signal_upload_contract` - status: completed - source: `tasks/443_redacted_signal_upload_contract.md`
- [x] `444_passive_feedback_collector` - status: completed - source: `tasks/444_passive_feedback_collector.md`
- [x] `445_unknown_shape_monitoring_readonly` - status: completed - source: `tasks/445_unknown_shape_monitoring_readonly.md`
- [x] `446_local_drift_guard_minimal` - status: completed - source: `tasks/446_local_drift_guard_minimal.md`
- [x] `447_five_bank_regression_fixtures` - status: completed - source: `tasks/447_five_bank_regression_fixtures.md`
- [x] `448_learning_safety_guardrails` - status: completed - source: `tasks/448_learning_safety_guardrails.md`
- [x] `449_sprint_8a_closeout_review` - status: completed - source: `tasks/449_sprint_8a_closeout_review.md`

- [x] `434_android_local_merchant_state_audit` - status: completed - source: `tasks/434_android_local_merchant_state_audit.md`
- [x] `435_android_receiving_methods_local_count` - status: completed - source: `tasks/435_android_receiving_methods_local_count.md`
- [x] `436_android_ventes_local_state_refinement` - status: completed - source: `tasks/436_android_ventes_local_state_refinement.md`
- [x] `437_android_local_state_ui_copy_tests` - status: completed - source: `tasks/437_android_local_state_ui_copy_tests.md`
- [x] `438_android_local_merchant_state_closeout` - status: completed - source: `tasks/438_android_local_merchant_state_closeout.md`

- [x] `425_android_data_hydration_audit` - status: completed - source: `tasks/425_android_data_hydration_audit.md`
- [x] `426_android_dashboard_lively_empty_states` - status: completed - source: `tasks/426_android_dashboard_lively_empty_states.md`
- [x] `427_android_local_system_state_cards` - status: completed - source: `tasks/427_android_local_system_state_cards.md`
- [x] `428_android_backend_state_fallbacks` - status: completed - source: `tasks/428_android_backend_state_fallbacks.md`
- [x] `429_android_webhook_optional_state` - status: completed - source: `tasks/429_android_webhook_optional_state.md`
- [x] `430_android_hydration_tests` - status: completed - source: `tasks/430_android_hydration_tests.md`
- [x] `431_android_hydration_closeout_report` - status: completed - source: `tasks/431_android_hydration_closeout_report.md`

- [x] `425_android_onboarding_flow_inventory` - status: completed - source: `tasks/425_android_onboarding_flow_inventory.md`
- [x] `426_android_onboarding_step_model` - status: completed - source: `tasks/426_android_onboarding_step_model.md`
- [x] `427_android_bank_target_lock_probe_for_onboarding` - status: completed - source: `tasks/427_android_bank_target_lock_probe_for_onboarding.md`
- [x] `428_android_onboarding_screens_full_activation` - status: completed - source: `tasks/428_android_onboarding_screens_full_activation.md`
- [x] `429_android_site_connection_skippable_onboarding_step` - status: completed - source: `tasks/429_android_site_connection_skippable_onboarding_step.md`
- [x] `430_android_onboarding_configuration_test_flow` - status: completed - source: `tasks/430_android_onboarding_configuration_test_flow.md`
- [x] `431_android_onboarding_tests` - status: completed - source: `tasks/431_android_onboarding_tests.md`
- [x] `432_android_onboarding_closeout` - status: completed - source: `tasks/432_android_onboarding_closeout.md`

- [x] `413_android_premium_source_of_truth_cleanup` - status: completed - source: `tasks/413_android_premium_source_of_truth_cleanup.md`
- [x] `414_android_bank_target_lock_model` - status: completed - source: `tasks/414_android_bank_target_lock_model.md`
- [x] `415_android_supported_bank_probe_ui` - status: completed - source: `tasks/415_android_supported_bank_probe_ui.md`
- [x] `416_android_premium_navigation_model` - status: completed - source: `tasks/416_android_premium_navigation_model.md`
- [x] `417_android_accueil_screen` - status: completed - source: `tasks/417_android_accueil_screen.md`
- [x] `418_android_revue_screen` - status: completed - source: `tasks/418_android_revue_screen.md`
- [x] `419_android_ventes_screen` - status: completed - source: `tasks/419_android_ventes_screen.md`
- [x] `420_android_menu_screen` - status: completed - source: `tasks/420_android_menu_screen.md`
- [x] `421_android_mode_confirmation_screen` - status: completed - source: `tasks/421_android_mode_confirmation_screen.md`
- [x] `422_android_security_screen` - status: completed - source: `tasks/422_android_security_screen.md`
- [x] `423_android_premium_operating_model_tests` - status: completed - source: `tasks/423_android_premium_operating_model_tests.md`
- [x] `424_android_premium_operating_model_closeout` - status: completed - source: `tasks/424_android_premium_operating_model_closeout.md`

- [x] `429_android_premium_receiving_method_substates` - status: completed - source: `tasks/429_android_premium_receiving_method_substates.md`
- [x] `430_android_premium_bank_management_states` - status: completed - source: `tasks/430_android_premium_bank_management_states.md`
- [x] `431_android_premium_receiver_health_states` - status: completed - source: `tasks/431_android_premium_receiver_health_states.md`
- [x] `432_android_premium_settings_subscreen_navigation` - status: completed - source: `tasks/432_android_premium_settings_subscreen_navigation.md`
- [x] `433_android_premium_copy_and_encoding_guardrails` - status: completed - source: `tasks/433_android_premium_copy_and_encoding_guardrails.md`
- [x] `434_android_premium_7m_validation_report` - status: completed - source: `tasks/434_android_premium_7m_validation_report.md`

## Recently Completed / Blocked

- [x] `visual_quality_gate_android_premium_design_system` - status: completed_static_gate_and_token_followup_added_screenshot_automation_pending - source: `.swimpay-agent/VISUAL_QUALITY_GATE_CLOSEOUT.md`
- [x] `android_visual_golden_screenshot_roborazzi` - status: completed_debug_baselines_recorded_and_verified - source: `.swimpay-agent/ANDROID_GOLDEN_SCREENSHOT_TEST_REPORT.md`
- [x] `hosted_checkout_browser_visual_baselines` - status: completed_chrome_headless_baselines_recorded_and_verified - source: `.swimpay-agent/CHECKOUT_BROWSER_VISUAL_BASELINE_REPORT.md`
- [ ] `android_visual_golden_remaining_surfaces` - status: recommended_next_visual_sprint - source: `.swimpay-agent/VISUAL_GOLDEN_BASELINE_CLOSEOUT.md`
- [x] `android_merchant_polish_static_data_cleanup` - status: completed_targeted_validation_passed - source: `.swimpay-agent/ANDROID_MERCHANT_POLISH_CLOSEOUT.md`
- [x] `review_actions_payment_state_machine_fix` - status: completed_pending_staging_redeploy - source: `.swimpay-agent/REVIEW_ACTION_STATE_MACHINE_CLOSEOUT.md`
- [x] `no_notification_fallback_runtime_wiring` - status: completed_with_android_gradle_memory_blocker - source: `.swimpay-agent/NO_NOTIFICATION_FALLBACK_RUNTIME_WIRING_REPORT.md`
- [x] `route_readiness_reservation_soft_disable` - status: completed - source: `.swimpay-agent/ROUTE_READINESS_SOFT_DISABLE_REPORT.md`
- [x] `423_android_premium_dashboard_state_rollout` - status: completed - source: `tasks/423_android_premium_dashboard_state_rollout.md`
- [x] `424_android_premium_reviews_state_rollout` - status: completed - source: `tasks/424_android_premium_reviews_state_rollout.md`
- [x] `425_android_premium_payment_detail_state_rollout` - status: completed - source: `tasks/425_android_premium_payment_detail_state_rollout.md`
- [x] `426_android_premium_orders_state_rollout` - status: completed - source: `tasks/426_android_premium_orders_state_rollout.md`
- [x] `427_android_premium_menu_subscreen_state_rollout` - status: completed - source: `tasks/427_android_premium_menu_subscreen_state_rollout.md`
- [x] `428_android_premium_state_rollout_report` - status: completed - source: `tasks/428_android_premium_state_rollout_report.md`

- [x] `417_android_premium_navigation_model` - status: completed - source: `tasks/417_android_premium_navigation_model.md`
- [x] `418_android_premium_screen_state_model` - status: completed - source: `tasks/418_android_premium_screen_state_model.md`
- [x] `419_android_premium_state_visual_components` - status: completed - source: `tasks/419_android_premium_state_visual_components.md`
- [x] `420_android_premium_subscreen_navigation_foundation` - status: completed - source: `tasks/420_android_premium_subscreen_navigation_foundation.md`
- [x] `421_android_premium_navigation_state_tests` - status: completed - source: `tasks/421_android_premium_navigation_state_tests.md`
- [x] `422_android_premium_navigation_report` - status: completed - source: `tasks/422_android_premium_navigation_report.md`
- [x] `413_android_frontend_legacy_reference_audit` - status: completed - source: `tasks/413_android_frontend_legacy_reference_audit.md`
- [x] `414_android_frontend_legacy_purge` - status: completed - source: `tasks/414_android_frontend_legacy_purge.md`
- [x] `415_android_premium_visual_tests_replacement` - status: completed - source: `tasks/415_android_premium_visual_tests_replacement.md`
- [x] `416_android_frontend_source_of_truth_report` - status: completed - source: `tasks/416_android_frontend_source_of_truth_report.md`
- [x] `407_sberbank_shadow_test_preflight` - status: completed_with_pending_live_capture - source: `tasks/407_sberbank_shadow_test_preflight.md`
- [x] `408_sberbank_shadow_consent_and_flags` - status: completed_with_pending_live_consent - source: `tasks/408_sberbank_shadow_consent_and_flags.md`
- [ ] `409_sberbank_real_notification_capture_redaction` - status: blocked_pending_explicit_live_consent - source: `tasks/409_sberbank_real_notification_capture_redaction.md`
- [ ] `410_sberbank_shadow_parser_matching_review` - status: blocked_no_real_signal - source: `tasks/410_sberbank_shadow_parser_matching_review.md`
- [ ] `411_sberbank_manual_review_webhook_rehearsal` - status: blocked_no_review_row - source: `tasks/411_sberbank_manual_review_webhook_rehearsal.md`
- [x] `412_sberbank_shadow_test_report` - status: completed - source: `tasks/412_sberbank_shadow_test_report.md`
- [x] `checkout_sender_bank_receiver_route_contract_fix` - status: completed_targeted_tests_passed - source: `.swimpay-agent/CHECKOUT_SENDER_BANK_RECEIVER_ROUTE_AUDIT.md`
- [x] `checkout_microcopy_late_buyer_claim_return_host` - status: completed_targeted_tests_passed_full_validation_pending - source: `.swimpay-agent/CHECKOUT_FINAL_STATE_MACHINE_CLOSEOUT.md`

- [x] Remove checkout edit CTA and neutralize checkout_edit query.
- [ ] Run staging manual walkthrough after redeploy.
## Checkout Contradiction Review (2026-05-13)

- [x] `checkout_contract_cold_audit` - status: completed_with_findings - source: `.swimpay-agent/CHECKOUT_CONTRADICTION_REVIEW.md`
- [x] `checkout_state_priority_audit` - status: completed_with_findings - source: `.swimpay-agent/CHECKOUT_STATE_PRIORITY_AUDIT.md`
- [x] `checkout_return_fulfillment_contradiction_audit` - status: completed_with_findings - source: `.swimpay-agent/CHECKOUT_RETURN_AND_FULFILLMENT_CONTRADICTION_AUDIT.md`
- [x] `checkout_bank_contract_contradiction_audit` - status: completed_with_findings - source: `.swimpay-agent/CHECKOUT_BANK_CONTRACT_CONTRADICTION_AUDIT.md`
- [x] `checkout_edge_case_matrix_20` - status: completed - source: `.swimpay-agent/CHECKOUT_EDGE_CASE_MATRIX.md`
- [ ] `checkout_contradiction_fix_pass` - status: pending_user_go - source: `.swimpay-agent/CHECKOUT_CONTRADICTION_CLOSEOUT.md`

## Checkout Contradiction Fix Sprint (2026-05-13)
- [x] sender_bank_source_of_truth_alignment - status: completed_validated - source: .swimpay-agent/CHECKOUT_CONTRADICTION_FIX_REPORT.md
- [x] checkout_state_renderer_alignment - status: completed_validated - source: .swimpay-agent/CHECKOUT_STATE_RENDERER_FIX_REPORT.md
- [x] deterministic_return_fallback - status: completed_validated - source: .swimpay-agent/CHECKOUT_RETURN_FALLBACK_FIX_REPORT.md
- [x] contradiction_fix_closeout - status: completed_validated - source: .swimpay-agent/CHECKOUT_CONTRADICTION_FIX_CLOSEOUT.md
- [x] `android_visual_gate_delock` - status: completed_validated - source: `.swimpay-agent/VISUAL_GATE_DELOCK_IMPLEMENTATION_REPORT.md`
- [ ] `android_login_welcome_mockup_polish` - status: pending_design_polish_mode - source: `design/reference/android-merchant/01_login_welcome.png`

## Android Merchant Mockup Polish (2026-05-14)

- [x] `android_login_welcome_mockup_polish` - status: completed_first_visual_pass_capture_recorded - source: `design/reference/android-merchant/01_login_welcome.png`
- [ ] `android_notification_access_mockup_polish` - status: next - source: `design/reference/android-merchant/02_notification_access.png`
- [ ] `android_bank_selection_mockup_polish` - status: pending - source: `design/reference/android-merchant/03_bank_selection.png`

## 2026-05-14T01:45:00+03:00 - Android Merchant Visual Queue
- [done] Add direct numbered Roborazzi captures for 02-14.
- [done] Record and verify numbered captures after the mockup-token pass.
- [next] Polish 02 notification access against the PNG reference.
- [next] Polish 03 bank selection spacing/logo/card density against the PNG reference.
- [blocked] 11 integrations list needs a dedicated production list screen instead of reusing integration detail.

## 2026-05-14T12:00:00+03:00 - Android visual rebuild queue
- [done] Neutralize old light `PremiumColors` palette.
- [done] Replace shared shell/card/button/bottom-nav output with mockup visual language.
- [done] Add 5-tab bottom nav and dedicated integrations list visual surface.
- [done] Ozon selectable in onboarding UI state.
- [done] Carte/SBP/Card+SBP visual selection in receiving setup.
- [next] Rebuild `07_dashboard_home` structure against mockup 07.
- [next] Rebuild `02_notification_access` and `03_bank_selection` exact layout.
