# Android Integration UI Simplification Report

## Goal

Keep the existing connected-site/developer integration feature, but stop presenting the screen as a developer console by default.

## Changed

- `Sites / Intégrations` subtitle simplified to `Connectez votre site à SwimPay`.
- Default list shows:
  - `Site / application`
  - `Webhook`
  - `Dernier test`
  - `Santé de livraison`
- Detail screen now shows:
  - site status
  - webhook status
  - last test result
  - delivery health
  - `Tester l'intégration`
  - `Configurer`
  - `Voir guide`

## Hidden by default

Technical details are no longer top-level:
- API key
- secret webhook
- URL details
- developer copy/export values

They are available only after expanding `Détails techniques`.

## Refused

- No new multi-site feature was added.
- No new developer mode was added beyond hiding the already-existing technical details.
- No backend/API contract changed.
