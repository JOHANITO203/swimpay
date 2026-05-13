# Checkout Bank Launcher Fix Report

Date: 2026-05-13

## Result

Le bouton `Aller a ma banque` reste branche sur la banque d'envoi acheteur via `selected_payer_bank_launcher_id`, et le rendu expose maintenant:

- `data-selected-sender-bank-id`;
- `data-payer-bank-launcher-id`.

## Contract

- `sender_bank_id` vient du choix acheteur.
- `selected_payer_bank_launcher_id` est derive du sender bank V1.
- `receiver_bank_id` vient de la route marchand.
- `selected_receiving_route_id` vient de la destination marchand.

## Step 2 UI

Les instructions affichent maintenant deux lignes distinctes:

- `Banque de reception`: banque/route marchand;
- `Banque d'envoi`: banque choisie par l'acheteur.

## Guardrails

- Le launcher ne lit pas `receiver_bank_id`.
- Aucun prefill montant/reference/carte/telephone n'a ete ajoute au deeplink.
- Aucun receiver arming ou webhook n'a ete change.
- Aucun paiement n'est confirme par le bouton.

## Tests

- Web checkout verifie que T-Bank sender et Sberbank receiver restent separes.
- API verifie `sender_bank_logo_asset_key=ic_bank_tbank` et `receiver_bank_logo_asset_key=ic_bank_sberbank`.
- Contract tests verifient que les sender banks viennent du launcher registry.
- Full validation: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, Docker Compose config, checkout screenshot verify, and Android JVM unit tests passed.
