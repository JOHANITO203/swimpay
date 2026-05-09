# Task 729 - Developer Link Guardrails Tests

Add tests for Developer Integration liaison and secret lifecycle.

Required tests:
- test liaison only reports verified after external 2xx delivery;
- queued-only is not labeled as verified;
- failed external response is shown as non-verified/action-required;
- test webhook remains `test_only=true`;
- test webhook does not trigger fulfillment;
- test webhook does not emit real payment confirmation;
- API key revoke blocks future SDK order creation;
- webhook secret revoke blocks future webhook verification with old secret;
- rotate revokes old secret and returns new value show-once;
- Android revoke/copy sensitive action uses device security gate;
- no raw key/secret in normal reads, logs or UI state;
- no auto-confirmation or public webhook semantic change.

Create:
`.swimpay-agent/DEVELOPER_LINK_GUARDRAILS_REPORT.md`
