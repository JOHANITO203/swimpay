# Task 581 - CR-2 Product Truth Guardrails

Goal:
- Add guardrail tests for CR-2 safety rules.

Verify:
- no runtime auto-confirm in V1;
- no public `payment.signal_detected`;
- no public `payment.needs_review`;
- no public `order.expired`;
- no `official_bank_confirmation=true`;
- no Android direct confirmation;
- no Android developer webhook send;
- no LLM/SMS/Accessibility/QUERY_ALL_PACKAGES introduced.

Do not weaken existing safety tests.

