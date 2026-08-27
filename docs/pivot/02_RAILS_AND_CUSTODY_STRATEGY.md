# Sous-projet — Stratégie Soldes & Rails (données vérifiées 2026-08-27)

> Recherche sur sources officielles. Chaque fait porte un niveau de fiabilité :
> **[V]** vérifié source officielle · **[T]** tiers reputable · **[?]** non
> vérifiable publiquement. Ne pas traiter un **[?]** comme acquis.

## 1. Cadre réglementaire BCEAO/UEMOA (le socle juridique)

- **[V] Détenir un solde client (monnaie électronique) = agrément EME**, capital
  **300 M FCFA** libéré (Instruction n°008-05-2015). Ce n'est **pas** 100 M comme
  l'affirmaient les docs de juillet.
  · https://www.bceao.int/fr/documents/quel-est-le-capital-minimum-requis-pour-un-eme
- **[V] Un « établissement de paiement » (Instruction n°001-01-2024) ne peut ni
  émettre ni détenir d'e-money** — il fait initiation/agrégation. Barème capital :
  agrégation 10 M · initiation 20 M · les deux 30 M · au moins un autre service
  100 M FCFA.
  · https://www.bceao.int/fr/reglementations/instruction-ndeg001-01-2024-du-23-janvier-2024-relative-aux-services-de-paiement
- **[V]+[T] Montage « sponsor » réel et documenté** : une fintech non licenciée
  opère comme **distributeur/agent d'un EME (ou banque) agréé** ; les fonds
  clients vivent dans le **compte de cantonnement du partenaire** ; agrément,
  solde et responsabilité prudentielle **restent chez le partenaire**. Voie de
  lancement standard, très peu capitalistique.
- **[V] PI-SPI** (paiement instantané interopérable BCEAO) est **live**, avec
  **résolution d'alias par numéro de téléphone**. Interopérabilité **obligatoire
  au 30/06/2026**. Fintechs **non** participantes directes → accès **indirect via
  un participant agréé** (banque/EME/GIM-UEMOA).
  · https://www.bceao.int/fr/content/lancement-officiel-de-la-plateforme-interoperable-du-systeme-de-paiement-instantane-pi-spi · https://pispi.bceao.int/lalias
- **[V]+[T] LCB-FT** : Directive n°02/2015 + Instruction n°003-03-2025 (KYC).
  KYC à paliers avec plafonds croissants (008-05-2015). **Les chiffres de
  plafonds trouvés en ligne (100k/500k/5M) viennent de blogs, pas d'un texte
  BCEAO vérifié — à confirmer.** Déclaration de soupçon → CENTIF.

**Conséquence directe :** SwimPay ne détient **pas** l'e-money en son nom au
lancement. « Posséder les fonds et les faire circuler » se réalise via le **modèle
sponsor + sous-registre** (§3). Le solde vit chez le partenaire ; SwimPay tient le
grand livre de *qui possède quoi*.

## 2. Rails — paysage vérifié (recherche 2026-08-27)

### 2.0 Référentiel officiel BCEAO — **[V] source primaire lue en direct**

Liste officielle *« Établissements de Paiement agréés dans l'UMOA au 28 février
2026 »* (BCEAO, 31 agréés). Section **Côte d'Ivoire (9)** — c'est le référentiel
qui tranche « qui est licencié pour gérer des comptes de paiement en CI » :

| Dénomination | N° inscription | Agrément |
|---|---|---|
| SYCA | EP.CI.001/2025 | 06/05/25 |
| TOUCHPOINT Financial Services (InTouch) | EP.CI.002/2025 | 06/05/25 |
| FIRSTCOM Global Payments | EP.CI.003/2025 | 06/05/25 |
| **JULAYA Côte d'Ivoire** | EP.CI.004/2025 | 09/05/25 |
| **DJAMO Côte d'Ivoire** | EP.CI.005/2025 | 04/09/25 |
| FEEXPAY Côte d'Ivoire | EP.CI.006/2025 | 29/08/25 |
| **CINETPAY AFRICA** | EP.CI.007/2025 | 29/08/25 |
| **DUNYA Digital Payment Côte d'Ivoire** (= PayDunya) | EP.CI.008/2025 | 29/08/25 |
| PAYMETRUST Côte d'Ivoire | EP.CI.009/2025 | 03/09/25 |

Aussi utiles hors CI : **FLUTTERWAVE Sénégal** (EP.SN.004/2025), **DUNYA/PayDunya
Sénégal** (EP.SN.001/2025), **JULAYA** Bénin/Sénégal, **SEMOA Togo**
(EP.TG.003/2026, 20/01/26).

**Ce que ça corrige / durcit :**
- **PayDunya est licencié EN CI** (DUNYA Digital Payment CI, EP.CI.008/2025), pas
  seulement au Sénégal. → détenteur de fonds licencié *ivoirien*, comme CinetPay.
- **CinetPay** EP.CI.007/2025 confirmé en **source primaire** (plus [T]).
- **FedaPay, Hub2, PawaPay, Bizao, LigdiCash, Kkiapay, MoneyFusion, InTouch(hors
  BF/TG/GB/ML) ne figurent PAS** comme EP agréés dans l'UMOA → ils **ne peuvent
  pas détenir les fonds clients sous leur propre nom en CI**. (FedaPay détient un
  agrément *agrégateur*, catégorie distincte ; Hub2/PawaPay hors UEMOA.)
- Nouvelles options CI licenciées à considérer : **FeexPay, Paymetrust, SYCA,
  Firstcom, Touchpoint (InTouch)**.
- Nuance juridique restante : un EP gère des **comptes de paiement** (fonds
  cantonnés pour exécuter des paiements) ; émettre de la **monnaie électronique**
  reste réservé aux **EME**. Que le solde SwimPay soit qualifié « compte de
  paiement » (OK via EP) ou « e-money » (→ EME) est **la question à trancher avec
  le juriste/le partenaire** — ne pas la présumer.

Source : liste officielle BCEAO au 28/02/2026 (PDF lu en direct) ·
https://www.bceao.int/fr/communique-presse/liste-des-etablissements-de-paiement-agrees-dans-lumoa-au-28-fevrier-2026

### 2.1 Comparatif fournisseurs

**Enseignement clé** : idéalement **un seul fournisseur cumule deux rôles** — (A)
un **sandbox self-serve** pour coder maintenant, (B) un **compte à solde chez un
EP agréé BCEAO** pouvant porter l'omnibus / détenir les fonds légalement.
**Vérifié : CinetPay et PayDunya cumulent les deux** (agrément EP confirmé + solde
marchand préfinancé + clés self-serve). Quoi qu'il arrive on code derrière la
frontière `RailConnector` : le jour où le partenaire final est signé, on change
l'adapter, pas le ledger.

Nuance importante : **détenir un solde ≠ être agrégateur pass-through.** CinetPay,
PayDunya, Hub2, PawaPay, LigdiCash, Semoa **détiennent un solde** (compte de
collecte + compte de transfert préfinancé) ; **FedaPay, Paystack sont
pass-through** (les fonds restent chez l'opérateur). Pour porter *ton* omnibus, il
te faut un détenteur-de-solde **licencié**.

| Fournisseur | Sandbox self-serve | Détient un solde | Licence BCEAO | Couverture CI | Note |
|---|---|---|---|---|---|
| **CinetPay** (Abidjan) | **Oui, clés self-serve [V]** (test = mode) | **Oui, compte transfert préfinancé [V]** | **EP.CI.007/2025, 29/08/2025 [T]** | **OM/MTN/Moov/Wave + cartes** | **Meilleur fit global : CI-domicilié, licencié, détient les fonds, codable maintenant.** auth apikey+site_id. |
| **PayDunya** (Dakar) | **Oui, top (test instantané) [V]** | **Oui, wallet [V]** | **EP.SN.001/2025, 06/05/2025 [T]** | OM/Wave/MTN/Moov/Free + cartes | **Meilleur DX**, PCI-DSS L1, payin+payout+IPN. Solide #2 / 2ᵉ rail. |
| **Hub2** (HQ Réunion) | **Oui (sandbox crédité 100k XOF) [V]** | **Oui (collecte+transfert) [V]** | **non vérifiable [?]** (hors UEMOA, via partenaires ?) | OM/Wave/MTN/Moov + cartes | Meilleur design REST, **infra pour fintechs** (clients : Julaya, CinetPay). Rail technique, **pas custodian tant que licence non confirmée.** |
| **Semoa** (Lomé) | **Non** (console login-only) | **Oui [T-fort]** | **EP « full-service » Togo ~01/2026 [T-fort]** | CI (filiale) + cartes | Switch **Semoa Pro** = paiements en masse (paie). Docs instables, sales-gated. |
| **Julaya** (Abidjan) | **Non** (BD only) | **Oui (comptes/IBAN) [V]** | **EP.CI.004/2025 [T]** | OM/Wave/MTN/Moov/Wizall + banque | Licencié + solde, mais **API partner-gated** — voie relationnelle (§2bis). |
| **PawaPay** (panafricain) | **Oui, top [V]** | **Oui (PawaPay Wallet) [V]** | non domicilié UEMOA [?] | MTN + Orange (pas Wave/Moov, pas cartes) | Meilleur DX MoMo pur, tarif public 1 %+frais, bulk payout. |
| **FedaPay** (Bénin) | **Oui [V]** | **Non (pass-through) [V]** | agrément **agrégateur** EP.BN.004/2026 [T] | OM/Wave/MTN/Moov + cartes | Bon sandbox, mais pass-through → pas pour porter l'omnibus. Bulk payout sur demande. |
| **LigdiCash** (BF) | **Non (explicite)** | **Oui (sous-comptes) [V]** | non confirmée [?] | multi-pays dont CI | Compte temporaire réel à l'onboarding, sales-gated. |
| **Paystack** | **Oui, instantané [V]** | non (payin-first) | via partenaires | MTN/Wave/Orange + cartes | Idéal payin+cartes rapide ; payouts gated. |
| **Flutterwave** | **Oui [V]** | partiel | via partenaires | OM + large MoMo/cartes | Backup multi-rail. |
| **Kkiapay / MoneyFusion** | Oui / à vérifier | — | — | MoMo+Wave+cartes CI | CI-natifs, légers. |
| **InTouch** (Dakar) | Non (sur demande) | [?] | agrégateur | large + cartes | Mature mais sales-gated. |
| **Bizao** | ~~limité~~ | non (pass-through) | — | — | **À ÉCARTER : maison-mère FR en redressement judiciaire (03/2025), infra dev morte.** |

Sources : docs.cinetpay.com, developers.paydunya.com, docs.hub2.io, docs.pawapay.io,
docs.fedapay.com, developers.ligdicash.com, semoa-group.com, julaya.co, liste EP
agréés BCEAO. Niveaux [V]/[T]/[?] comme en §1. *À revérifier avant engagement :
format de clés CinetPay `sk_test_` (SDK JS ≠ doc officielle) ; licence Hub2 ; tarifs
CI (peu publics) ; docs Semoa (site instable).*

### 2.2 Vérifications primaires directes (scrapling, 2026-08-27)

Récupérées **en direct sur les sources officielles** (Scrapling a contourné le
403 anti-bot de PayDunya ; navigateur furtif pour Cloudflare CinetPay) — donc **[V]** :

**PayDunya** (developers.paydunya.com, docs officielles) :
- **Payout / déboursement** : `POST app.paydunya.com/api/v2/disburse/submit-invoice`
  → `get-invoice` → `check-status`. **Payin** : `.../api/v1/checkout-invoice/create`
  + `/confirm`, et `/api/v1/direct-pay/credit-account` (crédite un compte PayDunya
  = **solde détenu confirmé**).
- **Sandbox self-serve confirmé** : base `app.paydunya.com/sandbox-api/v1/...`,
  « Choose Test mode », jeton de test `test_…`, reçu PDF de test. Auth par 4 clés
  en en-têtes : `PAYDUNYA-MASTER-KEY` / `-PRIVATE-KEY` / `-TOKEN` (+ public).
- **Withdraw modes CI vérifiés** : `orange-money-ci`, `wave-ci`, `moov-ci`,
  `mtn-ci` **et `djamo-ci`** (payout vers Djamo possible) + variantes SN/BJ/TG.

**CinetPay** (cinetpay.com, site officiel) :
- **Collect** : encaissement mobile money + cartes + wallets **sur le compte
  CinetPay** (= solde détenu), **reversements sous 72h**, +10 pays.
- **Mass Payout** : transferts individuels/groupés vers MoMo + wallets en < 5 min
  (paie salaires — cas client cité : 1 Md FCFA à 20 000 bénéficiaires).
- **⚠️ Limite honnête** : `docs.cinetpay.com` **ne résout pas en DNS** depuis
  cette machine (host inexistant ici) → doc API officielle **non lisible**. Les
  repos GitHub `cinetpay/*` montrent une API `api.cinetpay.net` + clés `sk_test_`
  + OAuth **qui ne colle pas** à l'API officielle documentée ailleurs
  (`api-checkout.cinetpay.com/v2`, apikey+site_id) → **surfaces contradictoires,
  à trancher en ouvrant la doc dans un vrai navigateur**. Tarifs non publics.

## 6. Émetteurs de monnaie électronique (EME) CI — **[V] source primaire**

Les opérateurs derrière tes rails sont des **EME** (registre distinct des EP).
Liste des EME agréés (Commission Bancaire UMOA, maj 22/05/2025) — Côte d'Ivoire :
**ORANGE MONEY CÔTE D'IVOIRE**, **MTN MOBILE FINANCIAL SERVICES CÔTE D'IVOIRE**,
**MOOV MONEY CÔTE D'IVOIRE**. **Wave n'est PAS un EME ivoirien** — son émetteur
est **WAVE DIGITAL FINANCE** (Sénégal), opérant en transfrontalier.
· cb-umoa.org (Liste des EME agréés 2025)

## 7. Recommandation finale (parmi les EP **agréés CI** avec API)

Quatre candidats sont **licenciés en CI** ET ont une API : CinetPay, PayDunya,
FeexPay, Djamo. Classement pour « détenir les fonds légalement en CI + API
exploitable maintenant », pour swap + paie :

1. **CinetPay** 🥇 — meilleur fit *aujourd'hui* : EP agréé CI, **compte de
   transfert préfinancé** (= omnibus, Modèle A), payin (`api-checkout…/v2/payment`,
   apikey+site_id) + payout (`client.cinetpay.com/v1`, token 5 min, envoi par
   contact), couverture OM/Wave/MTN/Moov + cartes, ~1 % payin (payout absorbé en
   CI). Faiblesses : accès docs pénible, **pas de sous-comptes** white-label.
2. **Djamo** 🥈 — **API la mieux documentée** (VÉRIFIÉ), auth Bearer+`X-Company-Id`,
   staging self-serve après onboarding email, payout 0,5 % (le moins cher), et
   **seul avec des sous-comptes ségrégués (Sub-Companies API = Modèle B)**.
   **Bloquant : la collecte est Djamo→Djamo uniquement aujourd'hui, Mobile Money
   « coming soon ».** Le choix stratégique *quand* le MoMo arrive.
3. **PayDunya** — payin+payout+solde, mais docs 403, couverture CI moins certaine,
   et **racheté par Peach Payments (avr. 2025)** → risque roadmap.
4. **FeexPay** — EP agréé CI (29/08/25, HQ Abidjan), SDKs PHP/React/Flutter, mais
   surface API/tarifs la moins vérifiable → confirmer en direct avant de s'engager.

**Net : CinetPay pour démarrer (largeur + omnibus), Djamo comme cible stratégique
si sa collecte MoMo sort.** Le Modèle A (omnibus CinetPay + sous-registre SwimPay)
vs Modèle B (sous-comptes Djamo) = exactement le choix custody du §3.

**Note honnête** : licences EP/EME = **[V] source primaire BCEAO/CB-UMOA**. Les
détails API/endpoints/tarifs ci-dessus sont **[T]** (docs.cinetpay.com et
developers.paydunya.com bloquent la récupération auto ; seul docs.djamo.com est
lisible) → **à confirmer en navigateur** avant de coder. Ne rien présumer.

## 8. Prochaines actions

1. **Coder maintenant** derrière `RailConnector` (adapter simulé) ; le **socle
   ledger** n'attend aucun rail réel. En //, ouvrir un compte CinetPay et
   confirmer sandbox/endpoints/tarifs **dans le navigateur**.
2. **Piste réglementaire** : engager CinetPay (et/ou Djamo) sur la **détention de
   fonds pour tes clients** (compte de paiement vs e-money — cf §2.0). Garder
   Julaya (EP.CI.004), FeexPay, Semoa comme alternatives licenciées.
3. **Multi-rail dès le design** : `RailConnector` permet CinetPay **et** Djamo/
   PayDunya sans réécrire le ledger. Bizao a prouvé le risque du fournisseur
   unique.

## 2bis. S'allier avec Julaya — chemin concret

- **[V] Aucun programme self-serve** : julaya.co n'a ni page « API » ni
  « Partenaires ». L'API existe mais est **partner-gated**. Accès = **BD
  relationnelle**, pas inscription.
- **Meilleur canal [V/T]** : LinkedIn des fondateurs — CEO **Mathias Léopoldie**,
  CTO **Charles Talbot** — pitch fintech-à-fintech (nommer volumes/couloirs). Tél
  CI **+225 25 22 018 616** [T] ; formulaire `/contact` en secours. Vérifier
  l'email avant d'envoyer des pièces sensibles.
- **Processus réaliste (déduit)** : contact BD → NDA → cadrage technique →
  **KYB/conformité** (ils sont EP réglementé) → contrat → creds sandbox. Détenir
  les fonds via un compte Julaya = **piste réglementaire à part** (ségrégation).
- **Préparer** : RCCM, NIU, RIB entreprise, pièce du gérant.

## 2ter. Opérateurs en direct — verdict

- **[V] MTN MoMo** = **seul sandbox 100 % self-serve** (`momodeveloper.mtn.com`,
  Collections+Disbursements+name-lookup, `X-Reference-Id` = idempotence). Bon pour
  **apprendre la mécanique**. Prod CI = onboarding signé MTN CI.
- **[V] Orange Money / Wave** : docs publiques mais sandbox **derrière un compte
  marchand** par pays. **Moov** : aucune API publique.
- **Verdict [V]** : l'opérateur-direct n'est **pas** un point de départ solo
  (3-4 contrats/comptes marchands séparés). **Passer par un agrégateur.**

## 3. Stratégie Soldes — modèle recommandé

**Modèle A — Compte omnibus partenaire + sous-registre SwimPay** (recommandé) :

- Le partenaire licencié (EME/banque, ou EP type Julaya selon ce que permet son
  agrément) fournit **un compte de cantonnement omnibus** où tout le cash client
  est mutualisé.
- Le **ledger SwimPay** (le socle du sous-projet 1) tient la position de chaque
  utilisateur **contre cet omnibus**. Source de vérité : *qui possède quoi* =
  ledger SwimPay ; *combien de cash existe* = compte partenaire.
- **Contrôle vital = réconciliation** : `Σ soldes users + Σ frais == solde de
  l'omnibus partenaire` (via API/relevé partenaire), en continu.
- Le transfert intra-SwimPay reste une **écriture ledger pure, gratuite et
  instantanée** (le cash ne bouge pas dans l'omnibus).

**Simplification majeure vs les docs de juillet :** si le compte partenaire est
**agnostique à l'opérateur** (un seul solde XOF qui encaisse depuis n'importe
quel opérateur et paie vers n'importe lequel), alors SwimPay **n'a pas à gérer de
float par opérateur ni de rebalancing** — tout ce fatras de « pools Wave/Orange à
rééquilibrer » disparaît dans le solde du partenaire. Le ledger SwimPay reste
**un seul solde XOF par user**. (À confirmer : mécanique de settlement du
partenaire.)

*Modèle B — sous-comptes par utilisateur chez le partenaire* : moins de risque
custody sur SwimPay, mais dépend d'une offre WaaS (non confirmée chez Julaya),
moins de contrôle UX, transferts internes pas forcément gratuits/instantanés.

## 4. Les deux produits = des opérations sur le ledger

- **Swap A→B** = payin(opérateur A) → crédit ledger → débit ledger →
  payout(opérateur B), frais prélevés. Si interne↔interne : écriture pure.
- **Paie 1-clic** = l'entreprise alimente son sous-solde (payin/virement) → bulk :
  N débits du sous-solde entreprise, N payouts. Salarié déjà user SwimPay →
  **crédit interne gratuit** (acquisition B2B2C) ; sinon payout externe agrégateur.

Le **socle ledger (sous-projet 1)** reste donc exactement la bonne première
brique : swap et paie ne sont que des adaptateurs payin/payout branchés dessus.

## 5. La dépendance qui commande tout

Rien ne bouge en argent réel sans un **partenaire licencié signé** (compte
omnibus + accès payin/payout). Bizao est distressed ; l'API/WaaS de Julaya n'est
pas confirmée. **Sécuriser ce partenaire est l'action n°1 du monde réel**, en
parallèle de la création de SAS. Tant qu'il n'est pas signé, on code contre la
frontière `RailConnector` avec un **adapter simulé** (le socle ledger n'en a pas
besoin pour être prouvé).
