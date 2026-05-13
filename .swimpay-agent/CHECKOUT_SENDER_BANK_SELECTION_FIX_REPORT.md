# Checkout Sender Bank Selection Fix Report

Date: 2026-05-13

## Result

La banque d'envoi acheteur est maintenant un contrat explicite et une selection UI visible.

## Changes

- Ajout du contrat `AvailableSenderBank` dans `packages/contracts`.
- Ajout du helper `toAvailableSenderBanks()` derive de `PayerBankLauncherRegistry`.
- `sender_bank_id` est valide contre `PayerBankLauncherRegistry`, pas contre les routes receiver.
- Le checkout read/status expose `available_sender_banks`, `selected_sender_bank_id`, `sender_bank_name` et `sender_bank_logo_asset_key`.
- Le click radio met maintenant a jour la classe visuelle `.selected` via `syncSenderBankChoices`.

## Product Guardrails

- La banque d'envoi reste independante de la banque de reception marchand.
- `runtime_verified` reste une capacite launcher/capture, pas une confirmation.
- `auto_confirm_enabled=false`.
- `official_bank_confirmation=false`.

## Tests

- Contract: `toAvailableSenderBanks()` expose les six banques, avec `selectable=true`.
- API: checkout expose `available_sender_banks`.
- Web: les banques d'envoi rendent `data-sender-bank-choice` et synchronisent l'etat visuel.
- Full test suite: 78 files / 691 tests passed.
