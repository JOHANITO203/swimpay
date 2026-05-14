# Android Merchant Asset Alignment Report

Date: 2026-05-13
Agent: Agent 3, Asset / Brand Agent
Scope: SwimPay Android Merchant premium bank and logo asset references

## Required Inputs Read

- `AGENTS.md`
- `design/ASSET_REGISTRY.md`
- `.swimpay-agent/ANDROID_MERCHANT_MOCKUP_IMPLEMENTATION_AUDIT.md`

## Audit Result

Gate: `PASS_WITH_REGISTRY_NOTE_CORRECTED`

The premium Android bank asset mappings are aligned with `design/ASSET_REGISTRY.md`.
No new bank or logo asset files were added or generated.

One registry note was corrected: `SwimPayLogo` is a runtime-used token-driven Compose brand composition. The production code does not render `R.mipmap.ic_launcher` through `painterResource`; that text exists only as a guardrail comment in `PremiumComponents.kt`.

## Android Premium Bank Asset Mapping

| Bank / fallback | Runtime key | Premium Android reference | Registry alignment |
| --- | --- | --- | --- |
| Sberbank | `sber_ru` | `R.drawable.ic_bank_sberbank` -> `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_sberbank.png` | aligned |
| T-Bank | `tbank_ru` | `R.drawable.ic_bank_tbank` -> `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_tbank.png` | aligned |
| VTB | `vtb_ru` | `R.drawable.ic_bank_vtb` -> `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_vtb.png` | aligned |
| Alfa-Bank | `alfa_ru` | `R.drawable.ic_bank_alfa` -> `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_alfa.png` | aligned |
| Gazprombank | `gazprombank_ru` | `R.drawable.ic_bank_gazprombank` -> `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_gazprombank.png` | aligned |
| Ozon placeholder | `ozon_bank` | `R.drawable.ic_bank_ozon` -> `apps/android-receiver/android/app/src/main/res/drawable/ic_bank_ozon.xml` | aligned as documented placeholder |
| Unknown bank | any unmapped `bankProfileId` | `bankIconResource(...) == null`, then `PremiumBankLogo` renders `displayName.take(1)` in the neutral framed fallback | aligned; no invented logo |

## Premium Android References Checked

- `PremiumBankLogo` and `bankIconResource` in `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`.
- Bank selector row, receiving-method row, bank manager list, and review-card call sites.
- `SwimPayLogo` and `SwimPayWavesMark` in `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt`.
- Android launcher and bank asset guardrail tests in:
  - `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantVisualArchitectureTest.kt`
  - `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/PremiumSettingsSubscreenContractTest.kt`

## Findings

- The five V1 supported banks use the registered `drawable-nodpi/ic_bank_*.png` assets.
- Ozon Bank uses only the documented `ic_bank_ozon.xml` placeholder and does not claim an official Ozon logo.
- Unknown bank fallback stays neutral by rendering a single display-name initial inside the shared premium logo frame.
- No premium Android code path was found that creates a generated bank logo or checkout-only bank-logo variant.
- `SwimPayWavesMark` remains a token-driven Compose mark and is not a resource logo file.
- `SwimPayLogo` registry wording was corrected to match the actual implementation instead of the stale `painterResource(R.mipmap.ic_launcher)` note.

## Tests / Commands Run

- `rg -n "ic_bank_|PremiumBankLogo|bankLogo|BankLogo|Sber|Sberbank|T-Bank|TBank|Tinkoff|VTB|Alfa|Gazprom|Ozon|unknown|fallback" apps/android-receiver design .swimpay-agent`
- `rg --files apps/android-receiver/android/app/src/main/res | rg "ic_bank|ic_launcher|notification"`
- `rg -n "SwimPayLogo|SwimPayWavesMark|painterResource\\(|R\\.mipmap|R\\.drawable" apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium`
- `rg -n -C 18 "private fun bankLogoDrawable|PremiumBankLogo|bankLogoInitials|bank logo|Ozon" apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- `rg -n -C 10 "PremiumBankLogo\\(" apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium`
- `rg -n "bankLogoDrawable|ic_bank_sberbank|ic_bank_tbank|ic_bank_vtb|ic_bank_alfa|ic_bank_gazprombank|ic_bank_ozon|R\\.mipmap\\.ic_launcher|painterResource\\(R\\.mipmap|painterResource\\(R\\.drawable" apps/android-receiver/android/app/src/main/java/com/swimpay/receiver apps/android-receiver/android/app/src/test`

No Gradle, lint, screenshot, or build command was run because this task was an asset-reference audit plus documentation correction only; no runtime Android source or resource file was changed.
