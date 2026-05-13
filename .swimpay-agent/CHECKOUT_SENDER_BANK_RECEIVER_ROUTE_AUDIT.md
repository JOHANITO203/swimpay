# Checkout Sender Bank / Receiver Route Audit

Date: 2026-05-13

## Scope

Audit du checkout acheteur avant correction du contrat:

- moyen de reception marchand;
- banque d'envoi acheteur;
- logos bancaires;
- routage du launcher bancaire;
- Expected Payment Profile.

## Verdict

Le modele est **partial**.

Le backend conserve deja `sender_bank_id`, `selected_receiving_route_id`, `selected_receiver_bank_id` et `selected_payer_bank_launcher_id` separes dans la session. En revanche le contrat checkout public ne nomme pas encore explicitement `available_sender_banks` et `available_receiving_methods`. L'UI affiche les launchers comme banques d'envoi, mais l'etat selectionne ne se met pas a jour au clic avant submit. Le launcher Step 3 utilise `selected_payer_bank_launcher_id`, ce qui est correct si ce champ reste derive du `sender_bank_id`.

## Surface Classification

| Surface | Classification | Finding |
| --- | --- | --- |
| Checkout Step 1 methode Carte/SBP | aligned | Les methodes visibles suivent `available_payment_methods` quand le backend les expose. |
| Checkout Step 1 banque d'envoi | partial | Les six banques sont rendues via `PayerBankLauncherRegistry`, mais le feedback visuel reste fige jusqu'au submit. |
| Backend `available_payment_methods` | aligned | Le backend expose `{ card, sbp }` depuis les routes actives. |
| Backend `available_routes` | aligned | Les routes merchant/receiver sont exposees avec `receiver_bank_id`, `bank_id`, `method_type`, `masked_value`. |
| Backend `available_receiving_methods` | missing | Le contrat demande un bloc explicite par methode de reception; il n'existe pas encore. |
| Backend `available_sender_banks` | missing | Le backend expose `/payer-bank-launchers`, mais pas le bloc checkout read/status attendu. |
| Expected Payment Profile | partial | `sender_bank_id` et route receiver sont persistes separement, mais `sender_bank_id` est valide contre `V1ReceiverBankOptions` au lieu d'une source sender explicite. |
| Step 2 receiver bank | partial | La banque de reception est affichee; le contrat ne remonte pas encore explicitement `receiver_bank_logo_asset_key`. |
| Step 2 sender bank | missing | Le resume instructions ne montre pas clairement la banque d'envoi choisie. |
| Bank logos | wrong_logo_mapping | Les 5 logos PNG dependent de `process.cwd()`; en staging cela peut echouer et tomber sur initiales, pendant qu'Ozon garde un placeholder CSS bleu. |
| Ozon logo | partial | Ozon est documente comme placeholder `OZ`, pas comme logo officiel. |
| Step 3 launcher | partial | Le rendu utilise `selected_payer_bank_launcher_id`; il faut verrouiller par tests que ce champ vient du sender, jamais du receiver. |
| Web fake provider | wrong_contract | Les tests liaient `selected_receiver_bank_id` et `selected_payer_bank_launcher_id` au `sender_bank_id`, ce qui masque les inversions. |

## Root Causes

1. Le contrat public checkout melange encore implicitement deux lectures:
   - `available_routes` pour les moyens/routes de reception marchand;
   - `payer_bank_launchers` pour les banques d'envoi acheteur.
2. L'UI Step 1 ne synchronise pas les classes `.sender-bank-choice.selected` au changement de radio.
3. Les logos web lisent les assets Android via `process.cwd()`, fragile en environnement deploiement.
4. Le Step 2 ne rend pas la banque d'envoi a cote de la banque de reception.
5. Les tests existants contiennent un fake provider qui inverse parfois sender et receiver.

## Constraints

- Aucun changement de semantique `payment.confirmed`.
- Aucun webhook ajoute ou modifie.
- Aucun auto-confirm.
- Aucun prefill bancaire sensible.
- Aucun nouveau logo non enregistre.
- Ozon reste `runtime_verified`, `auto_confirm_enabled=false`, `official_bank_confirmation=false`.

## Required Fix

- Ajouter un contrat explicite `available_receiving_methods`.
- Ajouter un contrat explicite `available_sender_banks`.
- Utiliser `PayerBankLauncherRegistry` comme source sender.
- Garder `selected_payer_bank_launcher_id = sender_bank_id` uniquement parce que le registry V1 utilise le meme identifiant; documenter via contrat et tests.
- Corriger le feedback visuel de selection banque d'envoi.
- Rendre le resolve de logos robuste hors repo root.
- Afficher sender bank et receiver bank separement dans les instructions.
- Ajouter tests backend et web de non-inversion sender/receiver/launcher.
