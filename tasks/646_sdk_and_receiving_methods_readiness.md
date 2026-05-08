# Task 646 - SDK And Receiving Methods Readiness

Status: completed_ready_with_staging_rehearsal_pending

Objective: verify SDK and merchant receiving methods readiness.

Checks:
- @swimpay/node order creation.
- SDK rejects auto_confirm / autoConfirm.
- Webhook verification.
- @swimpay/android opens checkout only.
- Receiving methods card/phone creation, masked_value, last4, bank_id, active/inactive.
- Checkout uses active routes only.

Deliverable:
- `.swimpay-agent/SDK_RECEIVING_METHODS_READINESS.md`

Result:
- Backend, web and SDK tests cover the contract.
- Live staging SDK order + checkout + webhook rehearsal remains pending.

