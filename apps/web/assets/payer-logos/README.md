# Payer launcher logos — West Africa (UEMOA / XOF)

Logos used by the hosted checkout for the West African payer launchers
(`WestAfricaPayerBankLauncherRegistry`). Resolved to data URIs by
`apps/web/src/screens/BankLogoAssets.ts` via the `bankLogoAssetKey()` key.

## ⚠️ These are clean PLACEHOLDER monograms, not official brand logos
The official brand logos could not be auto-fetched (they are not in any logo
library available here), and fabricating a real company's trademark is not
acceptable. Each file is a neutral, brand-coloured monogram tile so the checkout
looks clean today. **Replace each with the official asset** from the brand's
press kit / brand guidelines before any public launch.

| File | Key (`bankLogoAssetKey`) | Brand | Official source to fetch |
|---|---|---|---|
| orange_money.svg | ic_bank_orange_money | Orange Money / Max it | orange.com / orange.sn brand kit |
| wave.svg | ic_bank_wave | Wave | wave.com brand assets |
| mtn_momo.svg | ic_bank_mtn_momo | MTN MoMo | mtn.com brand portal |
| moov.svg | ic_bank_moov | Moov Money / Moov Africa | moov-africa.* press kit |
| free_money.svg | ic_bank_free_money | Free Money / Mixx by Yas | yas.sn / free.sn |
| wizall.svg | ic_bank_wizall | Wizall Money | wizallmoney.com |
| djamo.svg | ic_bank_djamo | Djamo | djamo.com brand |
| sg.svg | ic_bank_sg | SG Connect (Société Générale) | societegenerale brand |
| ecobank.svg | ic_bank_ecobank | Ecobank | ecobank.com brand |

Format: 96×96 SVG, rounded tile, brand primary colour, 2-letter monogram.
To swap: drop the official SVG/PNG here and update the `mime` in `BankLogoAssets.ts`.
