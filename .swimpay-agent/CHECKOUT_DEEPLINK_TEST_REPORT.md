# Checkout Deeplink Test Report

Date: 2026-05-10

## Contexte

Test réalisé sur le parcours externe:

SWIMVPN -> SDK/order SwimPay -> checkout hébergé staging -> paiement carte -> Ouvrir ma banque.

Le but du test était de vérifier que le checkout acheteur fonctionne après les derniers correctifs:

- méthode de paiement visible uniquement si le marchand dispose de la route active;
- montant exact payable avec micro-réconciliation;
- Step 1 mobile sans méthode manquante;
- POST checkout sans erreur de content-type;
- action `continue-to-bank` idempotente;
- aucun JSON brut 409 affiché à l'acheteur.

## Résultat utilisateur

Le parcours checkout est maintenant utilisable.

Le problème restant identifié par le test est le deeplink / launcher bancaire: le bouton `Aller à ma banque` ne produit pas encore l'expérience attendue d'ouverture fiable de l'application bancaire.

Ce blocage est distinct de la logique paiement:

- le checkout s'ouvre depuis l'app externe;
- la méthode affichée est cohérente avec les routes marchand;
- le montant exact payable est utilisé;
- la session peut être armée;
- aucun paiement n'est confirmé automatiquement;
- aucun webhook final n'est émis;
- aucune notification bancaire réelle n'a été traitée.

## Ce qui fonctionne

### External app vers checkout

L'app externe peut créer une commande SwimPay et ouvrir le checkout hébergé.

Le checkout n'est plus bloqué par les régressions précédentes:

- méthode unique carte correctement soumise sur mobile;
- POST sans body ne casse plus les routes checkout;
- double clic ou retry sur `Aller à ma banque` ne provoque plus un 409 brut;
- le backend garde `official_bank_confirmation=false`;
- `Aller à ma banque` ne confirme pas le paiement.

### Disponibilité des méthodes

Le checkout respecte maintenant la vérité marchand:

- si le marchand n'a qu'une route carte, seule la carte est proposée;
- SBP/téléphone n'est plus proposé si aucune route compatible active n'existe;
- le fallback tardif `Méthode indisponible` n'est plus le chemin normal attendu.

### Montant payable

SwimPay Intelligence et le checkout sont alignés sur:

- `display_amount_minor`: montant produit visible;
- `reconciliation_delta_minor`: micro-delta anti-collision;
- `payable_amount_minor`: montant exact à transférer.

Le matching fort doit utiliser `payable_amount_minor`, jamais seulement le montant affiché.

## Problème restant

### Deeplink / bank launcher

Le bouton `Aller à ma banque` reste la surface à traiter.

Le comportement attendu n'est pas encore garanti:

- ouvrir l'app bancaire exacte du payeur si elle est installée;
- sinon basculer vers un fallback manuel propre;
- ne jamais créer une impasse UX;
- ne jamais prétendre que les champs sont préremplis sans validation runtime;
- conserver les boutons de copie comme source fiable.

Le problème n'est pas une erreur de confirmation paiement.
C'est un problème de capacité launcher Android / deeplink.

## Lecture métier

`Aller à ma banque` doit seulement:

1. enregistrer l'intention de continuer vers la banque;
2. armer le receiver côté session;
3. tenter d'ouvrir l'app bancaire du payeur;
4. revenir sur un fallback manuel si l'ouverture échoue;
5. laisser l'acheteur copier montant, destinataire et référence;
6. ne jamais confirmer le paiement.

Le bouton ne doit pas:

- confirmer;
- émettre un webhook;
- traiter une notification réelle;
- initier un paiement bancaire;
- faire croire à une intégration bancaire officielle.

## Hypothèse technique principale

La couche checkout/backend est revenue à un état sain.

La prochaine incohérence probable se trouve dans une ou plusieurs surfaces:

- registre `BankLauncherRegistry`;
- mapping `sender_bank_id` -> `payer_bank_launcher_id`;
- packages Android réellement installés;
- schemes deeplink observés mais non validés runtime;
- fallback web/mobile quand aucun launcher utilisable n'est disponible;
- différence entre browser mobile et app Android native pour ouvrir un package.

## Risques

Sans sprint launcher dédié:

- l'acheteur peut devoir ouvrir sa banque manuellement;
- le bouton peut donner une impression d'échec même si le paiement reste possible;
- la qualité perçue du checkout baisse;
- les tests réels peuvent confondre "deeplink KO" et "paiement/matching KO".

## Guardrails conservés

Pendant ce test et les correctifs précédents:

- aucune notification bancaire réelle n'a été capturée;
- aucune auto-confirmation n'a été ajoutée;
- `payment.confirmed` reste manuel marchand uniquement;
- aucun webhook final n'est envoyé avant décision marchand;
- aucun PAN brut, téléphone brut, notification brute ou secret n'est exposé;
- `official_bank_confirmation=false` reste la vérité produit.

## Prochaine étape recommandée

Créer un sprint court dédié:

`BANK-LAUNCHER-RUNTIME-1`

Objectif:

- auditer le registry launcher actuel;
- vérifier `sender_bank_id` -> `payer_bank_launcher_id`;
- tester sur appareil réel les packages installés;
- tester `resolveActivity`, package launch et deeplink;
- ajouter un fallback manuel explicite si l'app bancaire ne s'ouvre pas;
- produire une matrice:
  - package installé;
  - deeplink résolu;
  - package launch OK;
  - prefill supporté;
  - fallback requis;
  - statut `experimental`, `observed`, `runtime_verified`, `certified`.

## Statut final

Checkout externe: opérationnel.

Blocage restant: deeplink / launcher bancaire.

Priorité suivante: validation runtime Android du launcher bancaire, sans toucher à la confirmation paiement ni au traitement de notifications réelles.
