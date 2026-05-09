# Developer Link Verification Todo

Status: planned.

Goal:
Turn Developer Integration testing into a real, merchant-visible proof that SwimPay and the external Android/web app are connected.

Product target:
- button: `Tester la liaison`;
- success copy: `Webhook active` / `Liaison verifiee`;
- failure copy: `Liaison non verifiee`;
- the status must depend on the external endpoint returning a successful response, not only on queuing a delivery.

Secret lifecycle target:
- API keys and webhook secrets remain show-once;
- normal reads stay masked;
- rotate revokes the previous active secret;
- revoke disables old credentials after merchant confirmation;
- Android destructive actions are gated by device security where available.

Boundaries:
- test webhook is test-only;
- no real fulfillment;
- no real `payment.confirmed` semantics change;
- no auto-confirmation;
- no raw secrets or raw payloads in UI/API/logs.

Task files:
- `tasks/725_developer_link_verification_inventory.md`;
- `tasks/726_webhook_liaison_test_contract.md`;
- `tasks/727_integration_secret_revocation_lifecycle.md`;
- `tasks/728_android_developer_integration_liaison_ui.md`;
- `tasks/729_developer_link_guardrails_tests.md`;
- `tasks/730_developer_link_closeout.md`.
