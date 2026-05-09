# Task 725 - Developer Link Verification Inventory

Audit the current Developer Integration flow before implementation.

Scope:
- Android Integration developpeur screen;
- backend `/v1/merchant/integration*` APIs;
- test webhook enqueue behavior;
- webhook delivery worker behavior;
- delivery history model;
- API key lifecycle;
- webhook secret lifecycle;
- Android copy/export flow.

Classify:
- already usable;
- only queued but not verified;
- missing liaison proof;
- missing revocation;
- unsafe or ambiguous copy;
- migration required.

Create:
`.swimpay-agent/DEVELOPER_LINK_VERIFICATION_INVENTORY.md`

Rules:
- do not process real bank notifications;
- do not change payment confirmation semantics;
- do not expose API keys, webhook secrets or raw payloads;
- test events remain test-only and non-fulfillment.
