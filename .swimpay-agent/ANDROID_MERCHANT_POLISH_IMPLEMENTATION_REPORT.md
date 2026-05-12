# Android Merchant Polish Implementation Report

Date: 2026-05-12

## Implemented

- Added `PremiumMerchantProfileUiState` and wired menu profile to mobile merchant session data.
- Removed runtime fake `JD` and fake merchant UID.
- Replaced configuration `allReady()` with current checklist built from:
  - notification access state;
  - enabled receiver bank profile ids;
  - receiving methods repository;
  - connected site repository.
- Reworked Receiver Health to avoid fixed `allowedBanksCount`, `trustedBanksCount`, queue length, or listener state.
- Added shared `PremiumReceivingMethodBankCatalog` backed by `BankTargetLock.supportedTargets`.
- Wired both receiving methods settings and onboarding receiving method bank selectors to the shared catalog.
- Changed payment detail signal timestamp fallback from fake relative time to `Signal non horodaté`.
- Made review tabs filter loaded reviews and show real local counters.
- Changed developer integration export to show `URL externe non configurée` and mark example URL as example.
- Changed confirmation mode screen to `Mode manuel V1` and removed assisted/AI activation copy.

## Design Impact

No layout redesign. The premium visual grammar, cards, spacing, and navigation model were preserved.

## Runtime Boundaries

- Android still calls backend for decisions.
- No local payment confirmation.
- No public webhook emitted by Android.
- No raw PAN, phone, or notification text added.
