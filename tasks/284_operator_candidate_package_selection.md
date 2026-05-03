# Task 284 - Operator Candidate Package Selection

Status: completed

## Scope

Map filtered package candidates to the five V1 bank profiles without guessing uncertain packages or assigning trust.

## Result

The filtered lookup produced one obvious candidate per selected V1 bank:

- `sber_ru` -> `ru.sberbankmobile`
- `tbank_ru` -> `com.idamob.tinkoff.android`
- `vtb_ru` -> `ru.vtb24.mobilebanking.android`
- `alfa_ru` -> `ru.alfabank.mobile.android`
- `gazprombank_ru` -> `ru.gazprombank.android.mobilebank.app`

Each candidate remains evidence material only. Selection does not imply production trust, official bank confirmation or auto-confirm eligibility.

## Safety

No uncertain candidate was promoted to trust. All candidates require backend evidence submission and operator review-only approval.
