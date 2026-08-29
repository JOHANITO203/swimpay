# DGI — API FNE : référence technique vérifiée

> **Verdict : l'API officielle existe.** Source primaire : « Procédure
> d'interfaçage des entreprises par API » (DGI, mai 2025, 26 p.), téléchargée
> depuis le portail officiel `fne.dgi.gouv.ci/documents/FNE-procedureapi.pdf`
> et **copiée dans** `assets/FNE-procedureapi-mai-2025.pdf`. Tout ce qui suit en
> est extrait — [V] primaire.

## 1. L'essentiel

- **REST + JSON**, méthode **POST** uniquement. Auth : **Bearer token** — la
  clé API apparaît dans l'espace FNE de l'entreprise (onglet « Paramétrage »),
  visible **uniquement par le gestionnaire principal, après validation DGI**.
- **Environnement de test public** : `http://54.247.95.108/ws` (IP brute, HTTP
  sans TLS — c'est l'officiel tel quel). Inscription test :
  `http://54.247.95.108`. **URL de production : transmise par la DGI après
  validation** de l'intégration.
- **Base légale [V]** : Arrêté **n°0337/MFB/DGI du 9 mai 2025** (modalités FNE ;
  loi de finances 2025, art. 384-385 CGI) —
  `fne.dgi.gouv.ci/documents/arrete_0337_modalites_fne_2025.pdf`. Art. 3 :
  (a) droit commun = plateforme web (`services.fne.dgi.gouv.ci`) + appli
  mobile ; (b) **sur option et après accord préalable du Directeur général des
  Impôts** = interfaçage **API** du système de facturation de l'entreprise ;
  (c) terminaux TERNE pour les reçus. Notre cas est prévu par le texte.
- **Programme « éditeurs / intégrateurs agréés » — CONFIRMÉ [V]** : formulaire
  officiel `documents/Formulaire_agrement_editeurs_integrateurs_solutions.pdf`.
  Dossier : RCCM, NCC, **Attestation de Régularité Fiscale < 3 mois**,
  attestation CNPS, engagement au cahier des charges ; dépôt au **Centre des
  Téléservices Fiscaux (Marcory zone 4)** ou `agrement.fne@dgi.gouv.ci` ;
  décision par un **Comité d'agrément**. La FAQ officielle confirme qu'une
  entreprise peut s'interfacer elle-même **ou passer par un éditeur agréé** —
  et Kompto (agréé) sert ses clients **sans accréditation propre de chaque
  client** : la voie « SwimPay agréé une fois pour tous ses marchands » est
  réelle.
- **Le terrain est quasi vide [V]** : la liste officielle des agréés
  (28/11/2025, `documents/entreprises_agrees_FNE.pdf`) compte **4 intégrateurs
  API** dans tout le pays — AB Soft Work (SAGE/Excel), Minlessika, Novasoft
  (SAGE), Progici (KOMPTO) — plus 1 fournisseur TERNE. Aucun ne couple la
  facturation aux **paiements + réconciliation**. Être le 5ᵉ agréé, et le seul
  adossé à l'encaissement, est une position forte.
- Contacts : `support.fne@dgi.gouv.ci`, `infos.fne@dgi.gouv.ci`,
  `agrement.fne@dgi.gouv.ci`, tél. 25 21 01 86 60.

## 2. Le chemin d'accès (officiel, 8 étapes)

1. Inscription de l'entreprise sur la plateforme FNE **de test** ;
2. Configuration/paramétrage de l'environnement de test ;
3. Développement de l'interfaçage ;
4. Tests de génération (vente, **avoir**, **bordereau**) ;
5. Envoi de **spécimens de factures** à `support.fne@dgi.gouv.ci` ;
6. Analyse de conformité par la DGI ;
7. La DGI transmet l'**URL de production** ;
8. La **clé API** apparaît dans l'espace de l'entreprise.

Pré-requis déclarés du logiciel : HTTP/REST, JSON, auth OAuth 2.0 ou
certificat (en pratique : clé API en Bearer), connexion stable.

## 3. Les trois opérations

| Opération | Endpoint | Corps |
|---|---|---|
| **Certifier une facture de vente** | `POST $url/external/invoices/sign` | `invoiceType:"sale"` + schéma §4 |
| **Certifier une facture d'avoir** | `POST $url/external/invoices/{id}/refund` | `items:[{id, quantity}]` — `id` = id d'article de la facture d'origine |
| **Certifier un bordereau d'achat** (produits agricoles) | `POST $url/external/invoices/sign` | `invoiceType:"purchase"` |

## 4. Schéma de la requête « vente » (champs clés)

- `invoiceType` : `sale` \| `purchase` — **O**
- `paymentMethod` : `cash` \| `card` \| `check` \| `mobile-money` \| `transfer`
  \| `deferred` — **O** *(→ nos ventes cash/virement passent nativement)*
- `template` : `B2B` (client à NCC) \| `B2C` (particulier) \| `B2G`
  (institution) \| `B2F` (international) — **O**
- `isRne` (bool) + `rne` (n° du reçu si lié) — **O**
- Client : `clientNcc` (**obligatoire si B2B**), `clientCompanyName`,
  `clientPhone`, `clientEmail`, `clientSellerName`
- `pointOfSale`, `establishment` — **O** ; `commercialMessage`, `footer` — N
- `foreignCurrency` (XOF/USD/EUR/JPY/CAD/GBP/AUD/CNH/CHF/HKD/NZD) +
  `foreignCurrencyRate` — obligatoires en **B2F**
- `items[]` : `taxes` (`TVA` 18 % \| `TVAB` 9 % \| `TVAC` 0 % exo. conv \|
  `TVAD` 0 % exo. lég.) — **O** ; `customTaxes[]` (`name`,`amount` — ex. GRA,
  AIRSI, DTD) ; `reference`, `description`, `quantity`, `amount` (PU **HT**),
  `discount` (%), `measurementUnit`
- `discount` global (%)

## 5. La réponse (200)

```json
{
  "ncc": "9606123E",
  "reference": "9606123E25000000019",
  "token": "http://…/fr/verification/019465c1-…",
  "warning": false,
  "balance_sticker": 179,
  "invoice": { …facture complète, "source": "api"… }
}
```

- `reference` = **le numéro officiel de la facture** (série annuelle
  ininterrompue, préfixée NCC ; avoir préfixé `A`).
- `token` = **l'URL de vérification à convertir en QR code** (le « sticker »
  visuel sur la facture imprimée/PDF).
- `balance_sticker` + `warning` = **le stock de stickers électroniques du
  marchand** — chaque certification en consomme un.
- Erreurs : 400 (requête invalide, ex. « Point of sale is not valid »), 401
  (« Invalid API Key »), 500.

## 6. Découvertes opérationnelles (à intégrer au produit)

1. **L'économie du sticker — tarifée [V]** : chaque certification consomme un
   sticker **prépayé** : **20 FCFA TTC par facture (FNE), 15 FCFA par reçu
   (RNE), gratuit pour les factures ≤ 5 000 FCFA** (excellent pour les
   micro-marchands). La réponse API donne le solde restant → fonctionnalité
   différenciante : suivi du stock + alerte avant rupture (sinon le marchand
   découvre la panne au moment de facturer). Coût à intégrer au discours
   pricing : ~20 F/facture à la charge du marchand, en sus de l'abonnement.
2. **La clé API est PAR entreprise (par NCC)** : notre `DgiAdapter` stocke une
   clé par marchand (chiffrée). La **validation DGI fait partie de
   l'onboarding marchand** — sauf si le statut « éditeur/intégrateur » permet
   une validation unique de SwimPay (à clarifier, cf. §1).
3. **Pas d'endpoint de statut/lecture documenté, pas d'idempotence** : un
   timeout après `POST /sign` peut avoir consommé un sticker sans qu'on ait la
   référence. Règles de l'adapter : **jamais de retry aveugle**, single-flight
   par facture, persistance de la requête et de la réponse brute
   (`external_event`), file d'exception + vérification manuelle dans l'espace
   FNE en cas de doute.
4. **Env de test en HTTP sur IP brute** : ne jamais y envoyer de vraies
   données clients ; jeux de données fictifs uniquement.
5. `paymentMethod` couvre cash/virement/mobile-money → notre « bouton facture
   pour toute vente » correspond exactement au modèle DGI.

## 7. Impact sur la spec V1 (`07_SPEC_CERVEAU_V1.md`)

- Module 2 : **`DgiAdapter` API officielle** (le plan RPA est abandonné ; il ne
  reste qu'un mode dégradé manuel en cas d'indisponibilité).
- Dès S1 : inscription d'une entreprise de test sur l'env. de test +
  **préparation du dossier d'agrément éditeur/intégrateur** (formulaire
  officiel + RCCM, NCC, Attestation de Régularité Fiscale, CNPS — dépend de la
  finalisation de la SAS ; dépôt à Marcory zone 4 ou `agrement.fne@dgi.gouv.ci`).
  En attendant l'agrément, la voie « par marchand » reste utilisable pour les
  pilotes.
- SDK communautaire existant (référence d'implémentation, non officiel) :
  `github.com/PRODESTIC/fne-sdk-php`.
- Nouveau champ produit : stock de stickers par marchand (affichage + alerte).

---

## 8. Ce que le guide utilisateur ajoute (relevé 29 août 2026)

> Source : **guide d'utilisation de la plateforme FNE**, 45 p., DGI —
> `assets/FNE-guide-utilisateur.pdf`. Pages rendues en images dans `assets/`.
> Ce guide décrit la **plateforme web** ; il éclaire l'API par correspondance.

### 8.1 Deux chemins selon le régime, et ce n'est pas anodin

| Régime du vendeur | Pièce émise | Support prévu | Sticker |
|---|---|---|---|
| **Réel** (RSI, RNI) | **FNE** — facture normalisée | plateforme · API · appli mobile | 20 F |
| **Forfaitaire** (TEE, TCE, RME) et **secteur du commerce** | **RNE** — reçu normalisé | **TERNE** (terminal) · appli mobile | 15 F |

Le guide (p. 5) :

> « Pour les entreprises au régime forfaitaire ou travaillant dans le secteur du
> commerce, les transactions seront sécurisées par des **reçus normalisés
> électroniques** délivrés via des **Terminaux d'Émission de Reçus Électroniques
> (TERNE)**. »

**Mais le RNE n'exige pas un terminal physique** : le formulaire de facturation
de la plateforme porte une **case à cocher `RNE`** (visible p. 31), et le schéma
de l'API porte `isRne` (bool) + `rne` (n° du reçu lié). **Notre logiciel peut donc
émettre les deux.** Un seul fournisseur de TERNE est agréé dans le pays
(GREEN PAY) — ne pas dépendre de lui est une bonne nouvelle.

**Conséquence de périmètre** : la V1 vise les non-assujettis (`12` §5). Le chemin
naturel de ce segment est le **RNE**, pas la FNE. À arbitrer explicitement, et à
tester des deux façons en bac à sable.

### 8.2 Le RNE est beaucoup plus léger que la FNE

Composition d'un RNE (p. 42) : les trois éléments de sécurisation (visuel FNE,
numéro séquentiel, QR de certification), les informations du vendeur, celles du
client, **le montant**, le mode de paiement.

**Pas de lignes d'articles, pas de TVA, pas de détail.** Le reçu montre
`MONTANT : 100 999 CFA` et rien de plus. Le vendeur y porte un `TERMINAL : n°`.
Le client payeur n'a que NCC et RCCM, tous deux facultatifs.

### 8.3 La FNE porte le régime fiscal des DEUX parties

L'exemple officiel (p. 42) montre, en en-tête vendeur : `NCC : 9500015F`,
**`Régime d'imposition : RNI`**, `Centre des impôts : 8046`. Et côté client :
`NCC : 1824723R`, **`Régime d'imposition : TEE`**.

> **La plateforme résout le régime à partir du NCC.** Nous n'avons pas à connaître
> le régime fiscal du client de notre marchand : il suffit de fournir le NCC.

C'est une simplification importante pour l'annuaire : le régime du **client** est
une donnée dérivée, pas une donnée saisie. Seul le régime de **notre marchand**
doit être tenu, parce qu'il décide du code de taxe (`12` §3).

### 8.4 La plateforme signale un client en cessation d'activité

Guide p. 31, encadré :

> « au cours du remplissage du formulaire de facturation B2B, **si le client est
> en cessation d'activité, vous serez informé par un message** indiquant la
> cessation d'activité de ce client. Vous pouvez cliquer sur « Continuer » ou
> interrompre la transaction. »

**Hypothèse forte, à confirmer en bac à sable** : c'est très probablement ce que
porte le champ **`warning`** de la réponse API (`"warning": false`). Si c'est
exact, on obtient **la validation du NCC client gratuitement, dans la réponse** —
ce qui rend inutile la consultation NCC bloquée par reCAPTCHA (`12` §4).

À vérifier : le `warning` remonte-t-il **avant** ou **après** consommation du
sticker ? La réponse décide de la conception du garde-fou.

### 8.5 Deux états, et un seul est certifié

Le formulaire propose deux boutons (p. 33) :

- **Sauvegarder la facture** — conservée en vue d'une validation ultérieure.
  **Non signée : ni QR code, ni numéro de série.**
- **Générer la facture** — produite avec tous les éléments de sécurité.

C'est exactement le modèle brouillon / certifiée. Notre schéma doit refléter les
deux, et **seule la seconde est append-only** : une facture générée ne se modifie
plus, elle se corrige par un avoir.

### 8.6 L'ordre de calcul : la TVA porte sur le montant remisé

Le résumé officiel (p. 33) donne un cas chiffré à vérifier dans nos tests :

```
Total HT      1 450 000
Remise           72 500
                          -> base = 1 377 500
Total TVA       247 950   = 18 % de 1 377 500
Total TTC     1 625 450
Autres taxes          0
Net à payer   1 625 450
```

**La remise s'applique avant la TVA.** Ce cas doit devenir un test de
`packages/brain/src/invoicer/totals.ts`, avec ces nombres exacts.

Le formulaire porte aussi des **« taxes sur total TTC »** (nom + taux + montant),
distinctes des `customTaxes[]` par article. Deux niveaux de taxes annexes, donc.

### 8.7 L'inscription exige NCC + NTD

Guide p. 6, étape 3 : le formulaire d'identification demande le **Numéro de Compte
Contribuable (NCC)** et le **Numéro de Télédéclarant (NTD)**, puis un parcours en
quatre étapes.

Vérifié le 29 août 2026 : l'environnement de test **répond** (`http://54.247.95.108/`,
HTTP 200) et son interface porte les mêmes libellés (`Inscrivez-vous`,
`Vérification du NCC`, `NTD`, et les erreurs `NCC inexistant` /
`company_not_registered`).

> **Ce sont deux identifiants réels délivrés par la DGI à un contribuable
> immatriculé.** Sans le NCC et le NTD de SwimPay — ou d'une entité prêtée pour
> les tests — l'inscription ne peut pas aboutir, même sur l'environnement de test.
> C'est la seule chose qui manque pour commencer à éprouver l'algorithme.

---

## 9. La plateforme en production, observée (29 août 2026)

> Source : enregistrement d'écran de 5 min 35 sur un poste de cabinet comptable
> en exercice, fourni par LO. Captures dans `assets/fne-video-*.jpg`. `[V]`
> **Réserve de méthode** : la bande son n'a pas pu être transcrite (clé Whisper
> refusée), et la personne filmée **répond oralement**. Tout ce qui suit vient
> des images seules ; ses réponses parlées restent à récupérer.

### 9.1 Deux domaines à ne pas confondre

| Domaine | Rôle |
|---|---|
| `fne.dgi.gouv.ci` | portail d'information, documents, inscription |
| **`services.fne.dgi.gouv.ci/fr/…`** | **la plateforme de service** : tableau de bord, facturation, stickers |
| `e-impots.gouv.ci` | portail fiscal général, dont la consultation NCC |

`e-impots.gouv.ci` est **segmenté par public** : *Immat. entreprises non
résidentes · Entreprises · **Experts-comptables** · CGA · Particuliers · FNE*.
L'existence d'un espace **Experts-comptables** dédié conforte la stratégie du
comptable comme canal (`11` §4.5) — à explorer, on ne sait pas ce qu'il ouvre.

### 9.2 Le nom d'utilisateur est le NCC

Connexion sur `services.fne.dgi.gouv.ci/fr/login` :
**`Nom d'utilisateur` = `2500736C`**, soit le NCC lui-même
(`assets/fne-video-0116-login-ncc.jpg`).

L'accès e-impôts, lui, demande **adresse email + numéro de télédéclarant +
mot de passe saisi sur un pavé numérique** à l'écran.

### 9.3 Une entreprise porte un IDU **et** un NCC

Tableau de bord (`assets/fne-video-0131-tableau-de-bord-idu.jpg`) :

```
CABINET TOPO BENHIBA
Régime d'imposition : RSI
Secteur d'activité   : AUTRE
IDU                  : CI-2025-0027163 N
NCC                  : 2500736C
Direction de rattachement       : DRAS I
Centre d'impôts / Poste comptable : 836 Impôts de Treichville II
```

**Réponse à l'inconnu `[?]` du gel** (`13` §6) : les deux coexistent. Une
entreprise créée en 2025 a un IDU au format `CI-AAAA-NNNNNNN L` **et** un NCC.
C'est le **NCC** qui sert d'identifiant de connexion et de champ de facture.

Le tableau de bord affiche aussi le **régime** (ici RSI) — donc notre marchand
n'a pas à le déclarer : il est lisible dans son propre espace.

**Menu de la plateforme** : Tableau de bord · Gestion des stickers · Gestion des
reçus et factures (émis / réceptionnés) · Paramétrage · Gestion des utilisateurs ·
Nomenclature. Version relevée : **v1.0.2 (04/01/2025)**.

### 9.4 Le formulaire réel — quatre champs obligatoires

| Champ | Obligatoire | Valeurs |
|---|---|---|
| Type de facture | **oui** | — |
| Mode de paiement | **oui** | — |
| **Type de facturation** | **oui** | **B2B (Entreprise) · B2C (Consommateur final) · B2F (Client International) · B2G (État et collectivités)** |
| `☐ RNE` | non | case à cocher, même écran |
| Nom de la société / du client | **oui** | — |
| Téléphone, Email du client | non | — |
| Autres Mentions | non | **préremplie** avec les coordonnées bancaires du vendeur |
| Pied de page | non | — |

Article : Quantité · Référence · Désignation · Unité de mesure · PU HT ·
Remise (%) · Total (Hors TVA) · **Taux d'imposition** · Autres taxes.
Puis un bloc **Remise** globale (% et montant sur le total HT).

### 9.5 Le résumé confirme l'ordre de calcul

`assets/fne-video-0356-resume-ht-apres-remise.jpg` — la plateforme affiche une
ligne que le PDF du guide n'avait pas :

```
Total HT
Remise
Total HT après remise     ← explicite
Total TVA
Total TTC
Autres taxes
Net à payer
```

**La TVA porte sur le « Total HT après remise ».** Confirmé deux fois : par le
cas chiffré du guide (§8.6) et par le libellé de l'écran.

### 9.6 La plateforme tient les factures REÇUES — et personne ne les lit

Deux découvertes que ni la documentation ni le guide ne mettaient en avant :

1. **`Reçus et factures réceptionnés`** — la plateforme agrège les factures que
   l'entreprise **reçoit** de ses fournisseurs, avec les mêmes totaux
   (`assets/fne-video-0419-factures-receptionnees.jpg`). Exemple observé sur
   14 jours : 400 000 CFA hors TVA, **Total TVA = 0** — une facture reçue d'un
   fournisseur non assujetti, le cas `TVAD` en conditions réelles.
2. **Un flux de notifications** « Vous avez reçu une nouvelle facture », avec
   *Voir la facture* et *Marquer comme lu*
   (`assets/fne-video-0442-notifications-factures-recues.jpg`). Les entrées
   observées vont de 35 à **219 jours** d'ancienneté, **toutes non lues**.

**Ce que ça vaut pour nous.** La DGI tient déjà un graphe à deux côtés : ce que
l'entreprise émet et ce qu'elle reçoit. Donc :

- **Le rapprochement des achats a une source officielle**, en plus des
  encaissements. Notre Rapprocheur peut apparier un décaissement à une facture
  fournisseur certifiée, pas seulement une vente à un encaissement.
- **Le flux existe et n'est pas exploité** — sept mois de notifications non lues
  chez un cabinet comptable en exercice. C'est un manque d'usage, donc une place
  à prendre.

### 9.7 Ce que la vidéo ne montre pas

À ne pas déduire : l'écran **Gestion des stickers** n'a pas été ouvert, et la
liste déroulante **Taux d'imposition** n'a pas été déroulée dans cet
enregistrement (le formulaire est resté vide). Le code `TVAD` reste établi par le
guide officiel (§`12` §3), pas par cette vidéo.
