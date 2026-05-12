# Visual Golden Baseline Closeout

generated_at: 2026-05-12T22:55:00+03:00

## Result

The Android Merchant premium visual gate now covers the core operating screens requested before icon polish.

## Implemented

- Roborazzi screenshot framework remains the Android Compose baseline gate.
- Android baselines now cover:
  - Dashboard
  - Review list
  - Review detail
  - Receiver Health
  - Moyens de reception
  - Developer Integration
  - Mode confirmation
- Hosted checkout browser baselines remain active for:
  - Intro
  - Buyer information
  - Payment instructions
  - Waiting state
  - Desktop instructions sanity
- Ozon Bank placeholder icon is documented in `design/ASSET_REGISTRY.md`.
- Android local merchant notifications now use the registered monochrome vector `@drawable/ic_notification_small`.

## Commands Passed

```powershell
npm run android:screenshot:record
npm run android:screenshot:verify
npm run checkout:screenshot:record
npm run checkout:screenshot:verify
```

## Remaining Visual Gaps

- Official bank logos can replace placeholders only when provided and registered.
- Web dashboard brand remains frozen/secondary.

## Guardrails

- No payment runtime change.
- No real bank notification processing.
- No auto-confirmation.
- No public webhook semantic change.
