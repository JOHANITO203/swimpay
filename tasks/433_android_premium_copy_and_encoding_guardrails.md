# Task 433 - Android premium copy and encoding guardrails

Scope: frontend-only Android premium UI and tests.

Strengthen tests for:

- no SBP wording in merchant UI
- no mojibake/encoding artifacts in premium UI source
- no forbidden confirmation claims
- no raw phone/card/notification text
- no webhook secret
- no package/cert jargon

Guardrails:

- preserve approved simple merchant language
- do not add technical jargon
