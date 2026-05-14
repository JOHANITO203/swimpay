# Android Integrations Runtime Wiring Report

generated_at: 2026-05-14T00:00:00+03:00

## Scope

Screens:
- Integrations List / Sites & integrations.
- Integration Details / Detail integration.

## Result

- Status: partially_wired_with_honest_fallbacks.
- Repositories reused:
  - `MerchantDeveloperIntegrationApiRepository`
  - `MerchantConnectedSiteApiRepository`
- Endpoints reused:
  - `GET /v1/merchant/integration`
  - `POST /v1/merchant/integration/keys`
  - `POST /v1/merchant/integration/keys/rotate`
  - `POST /v1/merchant/integration/webhook-secret/rotate`
  - `POST /v1/merchant/integration/webhook-url`
  - `POST /v1/merchant/integration/test-webhook`
  - legacy `GET /v1/android-merchant/connected-site`
  - legacy `POST /v1/android-merchant/connected-site/test`

## Changes

- Removed `debug`/`staging` forced connected-site preview fixture.
- Removed runtime fallback to `merchant.example`.
- Removed runtime fallback to fake `sp_live_...` keys and fake `whsec_...` secret.
- Removed fake delivery stats and fake `200 OK` delivery rows from runtime detail view.
- Missing integration values now display honest labels such as `À configurer`, `Non configuré`, `Non affichée`, `—` or `Aucune livraison récente disponible`.

## States

- Loading, empty, offline/error and content states are rendered from `PremiumScreenState`.

## Remaining Gap

- The current Android UI model has one connected-site/detail state, not a true multi-integration list collection. See `ANDROID_RUNTIME_CONTRACT_GAPS.md`.

