# Buyer Bank Launcher / Deeplink Report

## Implemented

- Added a V1 payer bank launcher registry for:
  - Sberbank;
  - T-Bank;
  - VTB;
  - Alfa-Bank;
  - Gazprombank.
- The registry stores exact package names and explicit prefill capability flags.
- All prefill flags are false until a bank-specific deeplink is actually validated.

## Current Hosted Web Behavior

- The hosted checkout presents `Ouvrir ma banque`.
- On web, the backend records `launcher_result=no_supported_launcher` and falls back to manual copy/paste instructions.
- This is intentional: hosted web cannot safely guarantee Android package launch or prefill.

## Pending

- Native Android bank launcher implementation remains a future sprint if SwimPay needs exact package-intent launching from an Android buyer context.

