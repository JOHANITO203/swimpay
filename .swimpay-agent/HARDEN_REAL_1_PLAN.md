# HARDEN-REAL-1 plan

generated_at: 2026-05-09T11:55:00+03:00

Objective: fix the blockers discovered by the multi-agent quality audit before any real bank notification test.

Parallel workstreams:

1. Runtime/payment intent gate hardening.
2. Backend production auth, secrets, API scopes and webhook URL hardening.
3. Android device proof, redaction, app lock and developer export cleanup.
4. Webhook delivery recovery and CI/deploy hygiene.

Non-negotiables:

- no real bank notifications;
- no auto-confirmation;
- no `payment.confirmed` semantic changes;
- no official bank confirmation wording/flags;
- no SMS, Accessibility, bank scraping, `QUERY_ALL_PACKAGES` or broad package enumeration;
- no raw notification text, raw phone/card values or secrets in public UI/logs/responses.

Closeout requirements:

- targeted tests for each fix;
- root typecheck, lint, tests, build;
- compose config;
- Android unit tests and staging build when Android source changes;
- closeout report.
