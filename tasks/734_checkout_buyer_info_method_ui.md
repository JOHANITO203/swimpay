# Task 734 - Checkout buyer info and method UI

Status: completed

Objective:
Refactor buyer identity and payment method collection without changing sensitive-data boundaries.

Implemented:
- Buyer first/last name form in a calm card.
- Payment method selector for card vs phone/SBP wording.
- Sender bank selector from supported bank list.
- Card sender input shown only for card method.
- Phone sender input shown only for phone method.
- Short security note: no CVV, expiry, SMS code, PIN.

Guardrails:
- Raw PAN/phone are never shown after submit.
- Browser form posts redirect back to the checkout flow.
