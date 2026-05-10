# Payment Compatibility Pair Audit

Date: 2026-05-10

## Scope

Audit focused on hosted buyer checkout, backend checkout mutations, Expected Payment Profile persistence, visible payment methods and structured fallback handling.

Out of scope:
- real bank notification processing;
- Android Receiver runtime changes;
- auto-confirmation;
- public webhook semantics;
- PAN kill switch.

## Findings

### Contradiction found

The previous Expected Payment Profile mutation could derive receiver-side fields from `sender_bank_id`.

Risk:
- buyer sender bank and merchant receiver bank could be confused;
- payer launcher could be treated like receiver bank;
- Step 2 and matching could lose the exact merchant receiving route context.

### Already aligned

- Checkout availability already hides methods using active merchant receiving routes.
- Certification-blocked routes are not exposed as checkout methods.
- `continue-to-bank` already rejects incomplete route/launcher selection and does not confirm payment.
- Matching runtime already has separate fields for `sender_bank_id`, `selected_receiver_bank_profile_id` and `selected_receiving_route_id`.

### Needed refactor

- Introduce a shared Payment Compatibility Pair contract.
- Persist `selected_receiving_route_id` when Step 1 creates the Expected Payment Profile.
- Keep `sender_bank_id` as payer-side truth only.
- Preserve structured backend errors so the web checkout can show action fallbacks instead of generic crashes.

## Safety Result

No payment confirmation semantics changed. `official_bank_confirmation=false` remains preserved.

