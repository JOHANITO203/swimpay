# Android Merchant Simplicity Closeout

## Completed

- Restored `SwimPay Intelligence` visibility on dashboard.
- Restored `SwimPay Intelligence` visibility on receiver health.
- Simplified dashboard integration wording.
- Simplified integrations list and detail default UI.
- Hid API key/secret/URL detail rows behind `Détails techniques`.
- Simplified receiver health wording.
- Simplified security settings.
- Preserved language, appearance, app lock, support and help entries.

## Validation

- `npm run android:compile` passed.
- `.\gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidRuntimeWiringGuardrailTest` passed.
- `npm run android:assemble:staging` passed.
- `git diff --check` passed with CRLF warnings only.

## Blockers

- `Orders/Ventes` remains a separate restoration blocker from the previous feature inventory.
- Integrations remain single connected-site by contract; no multi-site feature was added.
- Security remote sessions/devices remain unavailable because no real repository exists.
