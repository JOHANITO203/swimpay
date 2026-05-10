# Bank Launcher Activation Report

Date: 2026-05-10

## Scope

Activated buyer-side bank launcher metadata for checkout testing.

This is launcher-only:
- opens the buyer bank app when Android/browser supports `intent://` package launch;
- keeps copy/paste instructions as the required fallback;
- does not prefill a transfer;
- does not initiate payment;
- does not confirm payment;
- does not certify bank notification capture.

## Source

External APKTool sandbox:

`D:\Dev\ExternalTools\swimpay-apk-discovery`

Observed APK input source:

`C:\Users\Lenovo\Downloads\apkanalyser`

Observed registry:

`D:\Dev\ExternalTools\swimpay-apk-discovery\reports\bank-launcher-registry.observed.json`

## Activated Payer Launchers

| Bank | Launcher ID | Android package | Runtime status |
| --- | --- | --- | --- |
| Sberbank | `sber_ru` | `ru.sberbankmobile` | `not_validated` |
| T-Bank | `tbank_ru` | `com.idamob.tinkoff.android` | `not_validated` |
| VTB | `vtb_ru` | `ru.vtb24.mobilebanking.android` | `not_validated` |
| Alfa-Bank | `alfa_ru` | `ru.alfabank.mobile.android` | `not_validated` |
| Gazprombank | `gazprombank_ru` | `ru.gazprombank.android.mobilebank.app` | `not_validated` |
| Ozon Bank | `ozon_bank` | `ru.ozon.fintech.finance` | `not_validated` |

Ozon Bank is enabled only as a buyer launcher option. It is not added to V1 receiver bank capture/certification.

## Checkout Behavior

`Aller a ma banque` now:

1. posts `continue-to-bank`;
2. lets the backend arm the receiver first;
3. attempts to open the selected buyer bank package through an Android `intent://` URL;
4. returns to hosted checkout if the app cannot open;
5. keeps copy buttons and manual transfer instructions available.

The button still opens the payer bank, not the merchant receiver bank.

## Guardrails

- `sender_bank_id` must match `payer_bank_launcher_id`.
- `receiver_bank_id` stays tied to the receiving route.
- `payer_bank_launcher_id` is not used as receiver truth.
- All launchers have `can_prefill_* = false`.
- All launchers keep `official_bank_confirmation = false`.
- Android/browser launcher failure does not prevent receiver arming when the backend session is valid.

## Tests

Targeted tests run:

- `npm test -- packages/contracts/src/checkout.test.ts`
- `npm test -- apps/web/src/checkout.test.ts`
- `npm test -- apps/api/src/payment-sessions.test.ts`

