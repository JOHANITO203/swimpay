# Checkout Bank Contract Contradiction Audit

Date: 2026-05-13

## Sender vs Receiver separation

- `aligned`: backend persiste séparément `sender_bank_id`, `selected_receiver_bank_id`, `selected_receiving_route_id`, `selected_payer_bank_launcher_id`.
- `aligned`: expected profile valide `sender_bank_id` contre `PayerBankLauncherRegistry`.
- `aligned`: Step instructions affiche banque réception + banque envoi séparées.

## Contradictions found

1. `contradictory` — UI Step 1 “Banque d’envoi” est rendue depuis `payer_bank_launchers`, pas depuis `available_sender_banks`.
   - Impact: perte possible des flags `selectable`, `runtime_capture_status`, `logo_asset_key` de la source de vérité checkout.

2. `partial` — mapping logo calculé côté UI via `bankLogoAssetKey(bankId)` au lieu d’utiliser prioritairement la clé fournie par backend.
   - Impact: divergences visuelles si registre change.

3. `partial` — disponibilité méthode peut être dérivée fallback depuis banks/routes quand `available_payment_methods` absent.
   - Impact: en cas de réponse partielle backend, rendu potentiellement ambigu.

4. `aligned` — “Ouvrir ma banque” est lié au launcher payeur (`selected_payer_bank_launcher_id` / sender), pas à receiver bank.

## Classification

- Receiver method hydrated from merchant routes: `aligned`
- Sender bank registry exposure: `aligned`
- Sender bank UI source strictness: `contradictory`
- Logo contract strictness: `partial`
- Launcher bank ownership: `aligned`

