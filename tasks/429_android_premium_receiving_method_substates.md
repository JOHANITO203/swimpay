# Task 429 - Android premium receiving method substates

Scope: frontend-only Android premium UI.

Implement typed premium receiving-method rows and sub-states for:

- list content
- empty
- create draft
- create submitting/success/error
- disable submitting/success/error
- mark recommended submitting/success/error

Guardrails:

- no backend/API/contract changes
- no payment logic changes
- no raw card/phone in visible state after submit
- SBP wording is allowed only as copy for `phone_transfer`; no SBP integration, API, payment initiation or official confirmation claim
- no auto-confirm language
