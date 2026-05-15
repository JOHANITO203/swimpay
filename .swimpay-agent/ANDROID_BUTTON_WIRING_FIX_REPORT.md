# Android Button Wiring Fix Report

generated_at: 2026-05-15T01:30:00+03:00

## Fixed

- Dashboard quick actions now navigate:
  - `Revue` -> review queue tab.
  - `Méthodes` -> receiving methods route.
  - `Intégration` -> integrations tab.
- Dashboard metric cards now route to the relevant operational surface:
  - review/signal cards -> review queue.
  - webhook card -> integrations.
  - confirmation-rate card -> receiver health.
- Main `Récepteurs` tab now passes the same receiving-method runtime callbacks as the dedicated route:
  - create/save method.
  - edit label.
  - disable.
  - mark recommended/default.
  - delete.
- Main `Paramètres` tab now passes:
  - app lock toggle callback.
  - lock timeout callback.
  - Google account link callback.
- Dedicated receiving-method and receiver-health back arrows now navigate back to the settings tab.
- Receiver-health `Paramètres avancés` quick action now opens Android notification settings.

## Guardrail Added

`AndroidRuntimeWiringGuardrailTest` now checks that the main runtime route passes interaction callbacks and that dashboard visual actions are wired as clickable runtime actions.

## Validation

- `npm run android:compile` passed.
- `.\gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidRuntimeWiringGuardrailTest` passed.
- `npm run android:assemble:staging` passed.
- `git diff --check` passed.
- Staging APK installed successfully on the connected device.

## Remaining Interaction Risks

- Some diagnostic tiles are intentionally non-actionable until a real runtime action exists. They are left without click handlers instead of faking behavior.
- UIAutomator dump could not be collected because the Compose screen did not reach idle state during animation/glow rendering.
