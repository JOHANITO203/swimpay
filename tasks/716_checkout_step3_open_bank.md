# Task 716 - Checkout Step 3 open bank

Status: completed_web_fallback_only

Goal: implement `Ouvrir ma banque`.

Behavior:
- record `continue_to_bank`;
- set receiver/payment intent armed;
- attempt deeplink/package launch;
- record launcher result;
- fallback to manual instructions.

Output:
- `.swimpay-agent/BUYER_CHECKOUT_STEP3_REPORT.md`

Rules:
- no confirmation;
- no webhook;
- no review creation from this click alone.
