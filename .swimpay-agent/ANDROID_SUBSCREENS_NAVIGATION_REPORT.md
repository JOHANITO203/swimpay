# Android sub-screens navigation report

generated_at: 2026-05-09T00:08:00+03:00

## Navigation added

- `PremiumRoute.HelpCenter`
- `PremiumRoute.SupportContact`
- `PremiumRoute.Language`
- `PremiumRoute.Appearance`

## Menu wiring

- Application group:
  - Apparence
  - Langue
  - Securite
- Aide group:
  - Contacter le support
  - Centre d'aide
- Paiements group keeps:
  - Mode de confirmation

## App shell

- `PremiumMerchantApp` now loads and persists merchant settings.
- Login/account-entry screens receive language state.
- UI lock can short-circuit into `PremiumUnlockRequiredScreen`.

## Device smoke

- Installed `app-staging.apk` on Samsung `SM_S916B`.
- Launched `com.swimpay.receiver/.MainActivity`.
- UIAutomator dump showed the premium shell and the Moyens de reception screen with:
  - `Ajouter une carte`
  - `Ajoutez telephone SBP`
