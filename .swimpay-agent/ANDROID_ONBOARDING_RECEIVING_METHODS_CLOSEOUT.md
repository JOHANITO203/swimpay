# Android Onboarding + Receiving Methods Closeout

generated_at: 2026-05-15T23:10:00+03:00

## Completed

- Launcher icon added back into onboarding visual identity.
- Bank logos reused in onboarding and receiving method selection.
- Ozon Bank made selectable by onboarding state when detected/available.
- Receiving methods screen now offers a truthful destination replacement flow.
- Delete/disable/default callbacks remain wired to existing backend methods.
- Local session restore audited and confirmed present.

## Contract Note

The backend does not patch raw card/phone values on an existing receiving method. Android now handles user-facing "modifier la destination" by creating a new method and deleting the previous one after creation succeeds.

## Validation

- Compile passed.
- Targeted unit/static tests passed.
- Staging APK assembly passed.
- Staging APK installed and launched on device `R5CWA0FEPZW`.
