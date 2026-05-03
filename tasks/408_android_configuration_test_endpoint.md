# 408 - Android configuration test endpoint

Status: completed

Scope:
- Add `POST /v1/android-merchant/configuration-test`.
- Require authenticated merchant context.
- Run non-confirming readiness checks for phone, bank, receiving method and connected site.
- Do not confirm real payments or emit `payment.confirmed`.
- Return merchant-facing checklist labels and result state.
- Add tests.
