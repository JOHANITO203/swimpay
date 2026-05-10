# Checkout Method Availability Audit

generated_at: 2026-05-10T08:35:00+03:00

## Scope

Audit of the hosted buyer checkout payment-method availability bug observed on staging through SWIMVPN+.

## Observed Problem

- The checkout showed both `Carte` and `SBP` even when the merchant had no active SBP/phone receiving route.
- A buyer could choose SBP, submit a phone, and only then hit `Methode indisponible`.
- The fallback existed, but it was too late and not actionable enough.

## Root Cause

- The web checkout could derive visible methods from route summaries, but the backend read response did not expose a clear `available_payment_methods` contract.
- The `/v1/checkout/:id/receiver-banks` endpoint filtered routes by the already-selected payment method, which made alternative fallback methods invisible after a stale/incompatible selection.
- The no-route screen rendered a generic unavailable state instead of an actionable recovery path.

## Aligned Areas

- Route selection already filtered receiving routes by buyer payment method.
- Expected Payment Profile already rejected a method with no compatible active receiving route.
- `continue-to-bank` already rejected a selected route that became inactive or incompatible.
- No checkout path confirmed payment or emitted a public webhook.

## Gaps Found

- Missing explicit backend availability contract.
- Initial no-method checkout still allowed the intro panel before revealing configuration failure.
- Method-unavailable fallback did not clearly say which method the merchant currently accepts.
- Method-unavailable fallback did not offer direct method switching actions.

## Safety Boundary

No Android Receiver runtime was changed. No payment confirmation, webhook semantics, real notification capture, SMS, Accessibility, scraping or broad package enumeration was added.
