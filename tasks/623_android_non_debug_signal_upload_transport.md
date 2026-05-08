# Task 623 - Android non-debug signal upload transport

Status: completed

Goal: make Android Receiver non-debug runtime upload redacted signed outbox payloads to staging/prod backend.

Scope:
- Replace the non-debug WorkManager no-op with a real `/v1/receiver/signals` upload path.
- Use the persisted receiver backend URL and allow HTTPS staging/prod URLs.
- Upload only redacted signed payloads already accepted by the encrypted outbox.
- Ack successful uploads and mark safe retry metadata on failures.

Guardrails:
- Android must not confirm orders.
- Android must not send developer webhooks.
- No raw notification title/body/text storage or upload.
- No raw phone/card/PII in logs or retry errors.
- No SMS, Accessibility, `QUERY_ALL_PACKAGES` or broad app enumeration.

Validation:
- Add Android unit tests for success ack, safe retry, HTTPS backend state, and raw-data rejection.
- Run focused Android unit tests, then full validation before closeout.
