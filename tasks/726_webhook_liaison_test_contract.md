# Task 726 - Webhook Liaison Test Contract

Upgrade the Developer Integration test button contract from "queued" to a real liaison proof.

Expected behavior:
- merchant taps "Tester la liaison";
- SwimPay sends a test-only webhook to the configured external app/web endpoint;
- backend records the external response;
- if response is 2xx, integration status becomes verified;
- Android displays short success copy: `Webhook active` and `Liaison verifiee`;
- if response fails/times out, Android displays `Liaison non verifiee` with retry.

Required response fields:
- `liaison_status`: `verified` | `pending` | `failed` | `action_required`;
- `webhook_status`;
- `last_test_delivery_id`;
- `last_test_http_status`;
- `last_tested_at`;
- `safe_status`;
- `test_only=true`;
- `triggers_fulfillment=false`;
- `official_bank_confirmation=false`.

Rules:
- no real payment fulfillment;
- no public production payment event change;
- no `payment.confirmed` fulfillment semantics change;
- no secrets/raw payload in response.

Create:
`.swimpay-agent/WEBHOOK_LIAISON_TEST_CONTRACT_REPORT.md`
