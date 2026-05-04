# Task 402 - Buyer Payment Instructions Card/Phone

Status: completed

Scope:
- Add separate buyer instruction variants for `card_transfer` and `phone_transfer`.
- Keep raw card/phone out of normal rendered HTML.
- Preserve explicit copy behavior through existing copy-details API.

Result:
- Card instructions show card label, masked destination, amount, reference, open-bank action and `J'ai payé`.
- Phone instructions show phone label, masked destination, amount, reference, optional sender-phone field, open-bank action and `J'ai payé`.
- Tests verify raw destination values are not rendered.
