# Task 736 - Checkout UX guardrails tests

Status: completed

Objective:
Add tests that protect the new UX and payment-safety boundaries.

Covered:
- Intro displays the guided cards.
- Card method shows card input only.
- Phone method shows phone input only.
- Instructions expose copy controls.
- Card/phone raw values are not rendered in checkout HTML after submit.
- Waiting timeline keeps buyer-safe states.
- Signal detected does not imply payment confirmed.
- Form POSTs redirect into the flow instead of dumping JSON.
- Receiver arming and buyer paid claim do not confirm payment.
