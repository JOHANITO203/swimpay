# Task 285 - Five-bank Package Evidence Collection

Status: completed

## Scope

Collect exact PackageManager metadata for selected candidate packages and submit it to `/v1/bank-evidence`.

## Result

Submitted four new exact PackageManager evidence rows for the remaining V1 banks:

- `tbank_ru` / `com.idamob.tinkoff.android` -> `2517df4b-d7ae-4e3c-9ae2-e4697864d7c7`
- `vtb_ru` / `ru.vtb24.mobilebanking.android` -> `6508ef0a-aefa-4378-8194-f86a19828fd3`
- `alfa_ru` / `ru.alfabank.mobile.android` -> `8d28cbd9-d88e-4ca8-906d-751d05263889`
- `gazprombank_ru` / `ru.gazprombank.android.mobilebank.app` -> `fa54c539-7654-4f5a-b0ec-e0221a752c9a`

Each submission returned `pending_operator_review`, `trusted=false` and `auto_confirm_enabled=false`.

## Safety

Evidence collection used exact package lookups only. No notifications, SMS, app internals, app opening, installed-app report, production trust or auto-confirmation were used.
