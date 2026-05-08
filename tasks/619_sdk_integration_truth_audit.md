# Task 619 - SDK / Integration Truth Audit

Status: completed

Scope:
- Audited `@swimpay/node`, `@swimpay/android`, Developer Integration Wizard snippets and external merchant expectations.

Result:
- Main audit: `.swimpay-agent/SDK_INTEGRATION_SOURCE_TRUTH_AUDIT.md`.
- Aligned: Node SDK creates orders server-side, rejects `auto_confirm` and `autoConfirm`, requires raw-body webhook verification, and parses only public final V1 events.
- Aligned: Android SDK only opens checkout URLs and parses return links; it contains no secret key, webhook handler or payment confirmation behavior.
- Aligned: integration snippets mark fulfillment only after verified `payment.confirmed`.

Validation:
- Existing SDK product truth tests remain active.
- Central source-truth guardrail reasserts public webhook boundary.
