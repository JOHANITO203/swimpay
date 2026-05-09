# Buyer Checkout 4-Step Flow Audit

Date: 2026-05-09

## Result

The previous hosted checkout had useful visual steps, but the backend contract was incomplete for the new product truth.

## Findings

- Partially aligned: hosted checkout already had bank selection, route selection, copy instructions, `continue-to-bank` and `claimed-paid`.
- Missing: Step 1 did not persist a durable Expected Payment Profile with buyer identity, sender method, sender bank and protected sender hints.
- Missing: deterministic Latin/Cyrillic buyer identity normalization was not part of the checkout contract.
- Partial: Step 2 showed instructions, but did not produce a reliable backend `payment_instructions_shown` state before Step 3.
- Partial: Step 3 had a payer bank launcher concept, but hosted web cannot reliably launch Android bank packages or prefill bank details.
- Partial: Step 4 existed as buyer claim, but the API allowed out-of-order calls before receiver arming.
- Missing: signal-worker candidate mapping did not yet carry the new expected profile fields into Payment Intent Gate.

## Safety Baseline

- No auto-confirmation path was added.
- `J'ai payé` remains a buyer claim only.
- `continue-to-bank` arms the receiver only after payment instructions are shown.
- Public webhook semantics remain unchanged.
- No real bank notification was processed in this sprint.

