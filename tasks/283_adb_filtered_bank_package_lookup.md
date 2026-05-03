# Task 283 - ADB Filtered Bank Package Lookup

Status: completed

## Scope

Run keyword-filtered ADB package lookups only for the authorized V1 bank discovery keywords.

## Result

- Selected authorized real device `R5CWA0FEPZW` (`SM_S916B`).
- Used filtered `pm list packages` queries only.
- Created `.swimpay-agent/BANK_PACKAGE_CANDIDATES.md`.
- Reported only package names matching the allowed bank keywords.

## Candidates Found

- Sberbank: `ru.sberbankmobile`
- Tinkoff / T-Bank: `com.idamob.tinkoff.android`
- VTB: `ru.vtb24.mobilebanking.android`
- Alfa-Bank: `ru.alfabank.mobile.android`
- Gazprombank: `ru.gazprombank.android.mobilebank.app`

## Safety

No unrelated installed packages were reported. No app internals, notifications, SMS, scraping or app opening were used.
