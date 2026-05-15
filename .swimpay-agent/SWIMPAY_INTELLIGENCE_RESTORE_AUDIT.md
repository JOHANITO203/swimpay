# SwimPay Intelligence Restore Audit

## Sources checked

- `.swimpay-agent/ANDROID_DATA_HYDRATION_REPORT.md`
- `.swimpay-agent/ANDROID_LOCAL_MERCHANT_STATE_REFINEMENT_REPORT.md`
- `.swimpay-agent/SPRINT_8B_PAYMENT_INTENT_BOUND_REPORT.md`
- `PremiumMerchantRuntime.kt`
- `PremiumDashboardScreens.kt`
- Android task notes around local system cards and Accueil

## Finding

`SwimPay Intelligence` was not a new feature. It existed before the design pass as a visible merchant-facing local/system card and runtime concept.

Pre-design visible direction:
- `SwimPay Intelligence`
- `Téléphone connecté`
- notification access/local receiver status
- manual review-first signal preparation

## Regression

The latest design/runtime pass kept the runtime concept but made it less visible in the main UI. The dashboard emphasized metrics and integration status, while receiver health and integrations exposed more technical wording.

## Restoration

- Dashboard now shows a visible `SwimPay Intelligence` info card.
- Receiver Health now shows a `SwimPay Intelligence` explanation card.
- Copy is merchant-facing:
  - `Analyse les signaux`
  - `Aide à préparer la revue`
  - `Vérification manuelle requise`

## Not changed

- No backend logic changed.
- No new intelligence feature added.
- No automatic confirmation added.
