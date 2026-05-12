# Bank Logo Visibility Report

generated_at: 2026-05-12T22:55:00+03:00

## Result

Bank logo asset keys now flow through buyer checkout contracts and Android Merchant visual surfaces.

## Checkout

- Step 1 sender bank selection now renders sender banks from the payer launcher registry.
- Each sender bank choice exposes `data-logo-asset-key`.
- Ozon Bank is visible as `Ozon Bank` / `Ozon Банк` with `ic_bank_ozon`.
- Step 2 payment instructions show the merchant receiver bank, not the payer bank launcher.
- Step 2 receiver bank row exposes `receiver_bank_logo_asset_key` equivalent through `data-logo-asset-key`.

## Android Merchant

- Ozon Bank is added to exact package target lock with package `ru.ozon.fintech.finance`.
- Bank selector/catalog surfaces include Ozon Bank through the shared `BankTargetLock.supportedTargets`.
- Review cards now render the shared `PremiumBankLogo` instead of an empty placeholder square.
- Unknown sender bank remains neutral through the existing text fallback.

## Assets

- Added documented Android placeholder `apps/android-receiver/android/app/src/main/res/drawable/ic_bank_ozon.xml`.
- Added registered monochrome Android notification icon `apps/android-receiver/android/app/src/main/res/drawable/ic_notification_small.xml`.
- Updated `design/ASSET_REGISTRY.md`.
- No unregistered official-logo claim was made for Ozon.

## Guardrails

- Sender bank and receiver bank remain separated.
- Receiver bank row uses the selected receiving route bank.
- Payer launcher remains derived from sender bank.
- No payment confirmation behavior changed.
