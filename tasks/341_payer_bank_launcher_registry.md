# Task 341 - Payer Bank Launcher Registry

## Goal

Define payer bank launchers as buyer-side UX helpers only.

Payer bank launcher selection helps a buyer open or identify their own banking app. It does not prove payment, does not affect receiver-side detection capability and must not affect matching trust.

## Requirements

- Add a payer bank launcher registry with:
  - `payer_bank_launcher_id`
  - `display_name`
  - `country`
  - `android_package_candidates`
  - `deeplink_schemes`
  - `launch_strategy`
  - `fallback_strategy`
  - `enabled`
- Include:
  - Sberbank
  - T-Bank
  - VTB
  - Alfa-Bank
  - Gazprombank
  - YooMoney
  - Ozon Bank
  - MTS Bank
  - Post Bank
  - Raiffeisen
  - Other bank / manual transfer
- Use only known package hints already evidenced in the repo for the five V1 banks.
- Do not invent verified deep links.
- Mark unverified deeplink support as unknown or empty.
- Default unknown launchers to copy/manual fallback.
- Add tests proving launcher selection never proves payment or enables confirmation.

## Safety Notes

- Payer launcher means buyer-side opener only.
- Payer launcher selection must not change receiver trust, bank profile trust, matching outcome or auto-confirm gates.
