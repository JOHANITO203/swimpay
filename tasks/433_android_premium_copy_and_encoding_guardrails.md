# Task 433 - Android premium copy and encoding guardrails

Scope: frontend-only Android premium UI and tests.

Strengthen tests for:

- SBP wording is allowed only as copy for `phone_transfer`; no SBP integration, API, payment initiation or official confirmation claim
- no mojibake/encoding artifacts in premium UI source
- no forbidden confirmation claims
- no raw phone/card/notification text
- no webhook secret
- no package/cert jargon

Guardrails:

- preserve approved simple merchant language
- do not add technical jargon
