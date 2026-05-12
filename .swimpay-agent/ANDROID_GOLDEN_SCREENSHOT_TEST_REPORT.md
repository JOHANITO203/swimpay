# Android Golden Screenshot Test Report

generated_at: 2026-05-12T22:55:00+03:00

## Framework

Roborazzi is the Android Merchant visual regression framework for the current premium Compose surfaces.

Commands:

```powershell
npm run android:screenshot:record
npm run android:screenshot:verify
```

## Golden Screens

Versioned baselines:

- `apps/android-receiver/android/app/src/test/snapshots/premium_dashboard.png`
- `apps/android-receiver/android/app/src/test/snapshots/premium_review_list.png`
- `apps/android-receiver/android/app/src/test/snapshots/premium_review_detail.png`
- `apps/android-receiver/android/app/src/test/snapshots/premium_receiver_health.png`
- `apps/android-receiver/android/app/src/test/snapshots/premium_receiving_methods.png`
- `apps/android-receiver/android/app/src/test/snapshots/premium_developer_integration.png`
- `apps/android-receiver/android/app/src/test/snapshots/premium_confirmation_mode.png`

Covered Android Merchant surfaces:

- Accueil / dashboard
- Paiements a confirmer / review list
- Verifier ce paiement / review detail
- Telephone Receiver / Receiver Health
- Moyens de reception
- Integration developpeur
- Mode confirmation

## Result

- `npm run android:screenshot:record`: passed.
- `npm run android:screenshot:verify`: passed.
- Baselines were regenerated after the Ozon Bank placeholder icon and review-card bank logo wiring.

## Scope

- No payment runtime change.
- No webhook semantic change.
- No real notification processing.
- No auto-confirmation.
- Golden data is deterministic test state, not live payment state.
