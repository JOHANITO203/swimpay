# Checkout UX Refactor Audit

Date: 2026-05-09

## Scope

Hosted buyer checkout on `swimpay-web`.

Out of scope:
- real bank notifications;
- Android Receiver behavior;
- payment confirmation semantics;
- webhook taxonomy;
- auto-confirmation;
- backend matching decisions.

## Current State Before Refactor

The checkout had the right business ingredients:
- buyer identity and payment method collection;
- Expected Payment Profile creation;
- receiving-route selection;
- exact payment instructions;
- receiver arming;
- buyer paid claim;
- buyer-safe status states.

The UX problem was presentation, not product logic:
- the page felt like a long technical form;
- the intro, form, instructions and status lacked a clear continuous flow;
- copy actions were not visually prominent enough for bank transfer behavior;
- mobile safe-area spacing needed hardening;
- card and phone fields needed stronger progressive disclosure.

## Risk Review

No payment runtime change was required.

The refactor had to preserve:
- no raw PAN/phone after submit;
- no CVV/expiry/PIN/SMS;
- no public internal webhook;
- no auto-confirmation;
- no `payment.confirmed` before merchant manual confirmation.
