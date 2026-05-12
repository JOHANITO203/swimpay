# Checkout Final State Propagation Closeout

generated_at: 2026-05-12T23:45:00+03:00

## Answers

1. Why the buyer checkout did not update:
   - The waiting screen did not poll the checkout status endpoint, so it kept stale HTML after merchant confirmation.

2. Backend state that was already changed:
   - Review, order and payment session are updated by the merchant review decision path.

3. Backend state that was missing or misread:
   - No missing persistence was found locally for manual confirmation. The missing piece was browser-side status consumption.

4. Checkout source of truth:
   - API: `GET /v1/checkout/:id/status`.
   - Hosted web proxy: `GET /checkout/:paymentSessionId/status`.

5. Public `confirmed` status:
   - Yes. `manual_confirmed` maps to `checkout_state=confirmed` and `buyer_safe_status=confirmed`.

6. Frontend polling:
   - Yes. The waiting screen now polls the hosted status endpoint.

7. Polling final-stop behavior:
   - Yes. It reloads/stops on `confirmed`, `rejected`, `expired` or `cancelled`.

8. Rejected / expired / cancelled:
   - Rejected and expired are handled. `cancelled` is treated as a final polling stop for forward compatibility.

9. Tests:
   - Targeted contract/API/web tests passed locally.

10. Remaining before staging:
   - Redeploy web/API to staging, open a real checkout URL, confirm the review from Android Merchant, and verify the buyer page reloads into `Paiement confirme`.

## Product Guardrails

- No auto-confirmation.
- No real bank notification processing.
- No change to public webhook semantics.
- No official bank confirmation claim.
- No raw sensitive data exposure.
