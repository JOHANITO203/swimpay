# Julaya, et la V2 de SwimPay

> **Ce que ce document décide** : sur quel tableau de scores SwimPay accepte
> d'être jugé. Julaya est en avance sur tous ses chiffres à lui. La question
> n'est pas de le rattraper, c'est de choisir un terrain où son avance ne
> compte pas — et de vérifier que ce terrain existe.
>
> **Fiabilité** : `[V]` vérifié en source primaire (URL + copie dans `assets/`),
> `[T]` source tierce, `[H]` hypothèse posée par nous, dérivation montrée.
> Relevé le **29 août 2026**. À lire après `09_PAYDUNYA_TARIFS.md` et
> `10_JULAYA_TARIFS.md`, qui portent les grilles et l'actionnariat.

---

## 1. Julaya aujourd'hui

### 1.1 Les chiffres

| Chiffre | Valeur | Fiabilité | Source, date |
|---|---|---|---|
| Entreprises clientes | **> 1 000** | `[V]` | Agence Ecofin, 21 oct. 2025 |
| Professionnels sur la plateforme | **> 10 000** | `[V]` | `julaya.co/fr`, 29 août 2026 |
| DAF / DG utilisateurs quotidiens | **> 1 000** | `[V]` | `julaya.co/fr`, 29 août 2026 |
| Paiements et salaires traités | **> 700 000 / an** | `[V]` | `julaya.co/fr`, 29 août 2026 |
| Flux traités | **> 1 000 Md FCFA** | `[V]` mais ambigu (§1.2) | KOACI, 17 oct. 2025 |
| Pays | **4** — CI, Sénégal, Bénin, Togo | `[V]` | `julaya.co/fr`, 29 août 2026 |
| Agrément | **EP.CI.004/2025**, BCEAO, mai 2025 | `[V]` | Ecofin |
| Fondation | 2018, Léopoldie et Talbot (ex-LemonWay) | `[V]` | Ecofin |
| Dernier financement | **800 M FCFA**, CDC-CI Capital, obligations convertibles | `[V]` | Ecofin / KOACI, 17 oct. 2025 |
| Levées cumulées | ≈ 7,8 M$ + 800 M FCFA | `[T]` | `10_JULAYA_TARIFS.md` |
| Gain client annoncé | −85 % de temps sur la gestion des paiements | `[V]` (leur promesse) | `julaya.co/fr` |

### 1.2 Le chiffre qu'il ne faut pas répéter tel quel

**1 000 Md FCFA ÷ 700 000 paiements = 1,43 M FCFA par opération.** Pour une
plateforme dont le produit phare est le **versement de salaires**, cette moyenne
est très haute : elle supposerait un salaire moyen de 1,4 million.

Trois lectures possibles, et je ne peux pas trancher entre elles :

1. les 1 000 Md sont **cumulés depuis 2018**, pas annuels — la formulation de
   KOACI, « flux annuels **déjà** traités », se contredit elle-même ;
2. les 700 000 comptent des **lots**, pas des lignes ;
3. les flux sont dominés par les **virements inter-entreprises et la trésorerie**,
   pas par la paie, ce qui rendrait la moyenne plausible.

**Règle de travail** : pour tout calcul de marché ou de deck, retenir l'ordre de
grandeur, jamais le chiffre exact. Si quelqu'un nous oppose « Julaya fait 1 000
milliards par an », la bonne réponse est : « sur quelle période, et avec quelle
définition de flux ». C'est une question qu'on nous posera aussi.

### 1.3 Ce que Julaya vend, mot pour mot

Navigation du site, relevée le 29 août 2026 `[V]` :

- **Produits** : Transfert d'argent · Collecte · Facturation
- **Fonctionnalités** : Approvisionner son compte · Multi-entreprises et
  sous-comptes · Niveaux d'accès et de validation · Sécurité des transactions ·
  Suivi en temps réel · Exports comptables · RIB JULAYA

Attention au faux ami : chez Julaya, « **Facturation** » veut dire *payer les
factures de ses fournisseurs et encaisser celles qu'on a émises*. Ce n'est pas
l'émission d'une facture légale. La grille le confirme : « Facturation
(encaissement de factures émises) 0,1 à 0,5 % » et « Paiement de factures
fournisseurs (CIE, SODECI, HKB Pass) 0,5 % ».

### 1.4 Ce que Julaya ne fait pas — et c'est la porte

Recherche exhaustive sur `julaya.co/fr`, 29 août 2026 `[V]` :

> **Aucune occurrence de** : « facture normalisée », « FNE », « DGI », « impôts »,
> « crédit », « prêt », « épargne ».
>
> Seule mention comptable du site : « Facilitez la gestion de votre
> comptabilité » et la fonctionnalité « **Exports comptables** ».

Julaya s'arrête au paiement et rend un fichier. **Il ne referme pas la boucle
vers l'administration fiscale.**

Et ce n'est pas un oubli passager. La liste officielle des agréés FNE, signée du
Directeur Général des Impôts le **28 novembre 2025** (n° 0008/MFB/DGI-CAB/CT/KY,
téléchargée et archivée dans `assets/entreprises_agrees_FNE.pdf`, rendu lisible
dans `assets/dgi-agrees-fne-28nov2025.png`) `[V]` :

**Éditeurs et intégrateurs de solutions d'interfaçage par API — quatre, en tout
et pour tout :**

| N° | NCC | Raison sociale | Logiciels agréés |
|---|---|---|---|
| 1 | 9819357M | AB SOFT WORK | SAGE 100, SAGE 1000, SAGE X3, Microsoft Excel |
| 2 | 1848129E | MINLESSIKA | Minlessika, Microsoft Excel |
| 3 | 2128450B | NOVASOFT SARL | SAGE 100, SAGE 1000 |
| 4 | 2500583F | PROGICI SARL | KOMPTO |

**Fournisseurs de TERNE — un :** GREEN PAY (1925578V).

Trois faits se lisent dans ce tableau, et ils portent toute la stratégie :

1. **Les quatre agréés sont des revendeurs de logiciels comptables.** Trois sur
   quatre revendent SAGE. Aucun n'encaisse de l'argent.
2. **Aucun opérateur de paiement n'y figure.** Ni Julaya, ni PayDunya, ni Djamo,
   ni Wave, ni Orange. Personne ne relie *encaisser* et *facturer*.
3. **La liste n'a pas bougé depuis neuf mois.** Elle est datée du 28 novembre
   2025 et c'est toujours celle que la DGI publie le 29 août 2026, alors qu'elle
   se dit « non exhaustive, sera complétée ». Le comité d'agrément est lent : la
   fenêtre est ouverte, mais elle est ouverte **pour nous aussi lentement que
   pour les autres**. C'est un délai à intégrer au plan, pas un cadeau.

### 1.5 La taille du terrain vide

| | Valeur | Source |
|---|---|---|
| Entreprises inscrites à la plateforme FNE | **> 52 000** au 24 févr. 2026 | `[T]` DGI, via Abidjan.net / gouv.ci |
| Dont actives (au moins une facture émise) | **≈ 70 %**, soit ≈ 36 400 | `[T]` idem |
| Clients de Julaya | > 1 000 | `[V]` |
| **Part du parc FNE que Julaya touche** | **≈ 2 %** | calcul |
| Obligation légale | toutes entreprises, **depuis le 1ᵉʳ déc. 2025** | `[T]` DGI |
| Sanction réelle | pas d'attestation de régularité fiscale → **exclu des marchés publics** | `[T]` |

**51 000 entreprises ont une obligation datée, sanctionnée, et aucun outil qui
la relie à leur encaissement.**

---

## 2. Le tableau qui ne flatte personne

Aujourd'hui, 29 août 2026.

| | Julaya | SwimPay |
|---|---|---|
| Clients payants | > 1 000 entreprises | **0** |
| Utilisateurs | > 10 000 professionnels | **0** |
| Flux traités | ordre de grandeur : centaines de Md FCFA | **0 F** |
| Opérations traitées | > 700 000 / an | **0** |
| Pays en production | 4 | **0** |
| Agrément BCEAO | EP.CI.004/2025, depuis mai 2025 | **aucun** |
| Partenaire de rail signé | n/a (licencié lui-même) | **aucun** |
| Argent réel déplacé | oui, depuis 2018 | **jamais** |
| Ancienneté | 8 ans | 0 en production |
| Capital levé | ≈ 7,8 M$ + 800 M FCFA | **0** |
| Actionnaire opérateur | **Orange Ventures** | aucun |
| Actionnaire public | **CDC-CI Capital** (État ivoirien) | aucun |

**Il n'y a pas de match.** Sur chaque ligne où Julaya a un chiffre, SwimPay a
zéro. Il faut le dire comme ça, y compris devant un investisseur : le contraire
s'entend tout de suite.

### 2.1 Ce que SwimPay a réellement, et qui est mesurable

Ce ne sont pas des chiffres de marché. Ce sont des chiffres de construction,
mesurés dans le repo aujourd'hui.

| Actif | Mesure | Vérification |
|---|---|---|
| Modules du cerveau | 4 (rapprocheur, facturier, annuaire, routeur) + adaptateurs de rails | `packages/brain`, `packages/rails` |
| Code du cerveau, hors tests | **2 485 lignes** | compté |
| Cas de test cerveau + rails | **98 cas, 169 assertions** | compté |
| Tables de base construites | **40**, sur 4 migrations | 037 : 20 · 038 : 3 · 039 : 9 · 040 : 8 |
| Invariants prouvés sur Postgres 16 réel | **60** | 037 : 12 · 038 : 11 · 039 : 26 · 040 : 11 |
| Migrations rejouées deux fois sans erreur | oui | idempotence prouvée |
| API DGI FNE | vérifiée en source primaire, testable, **non branchée** | `08_DGI_FNE_API.md` |
| Grilles tarifaires des rails | 2 partenaires relevés en primaire | `09`, `10` |

Traduction honnête : **SwimPay n'est pas une entreprise, c'est un logiciel qui
n'a pas encore de client.** Ce qui existe est le socle comptable et l'ossature
fiscale — c'est-à-dire précisément ce que Julaya n'a pas construit, parce que ce
n'est pas son métier.

### 2.2 La décision de ce document

Le tableau du §2 est le tableau de scores **de Julaya** : volume, opérations,
pays, capital. Sur celui-là, on perd pendant des années, quoi qu'on fasse.

**Notre tableau de scores doit être un autre, et il doit être un où Julaya est à
zéro aujourd'hui, publiquement et vérifiablement.**

| Notre métrique | Julaya | SwimPay |
|---|---|---|
| Factures légales certifiées émises | **0** `[V]` | 0, mais c'est le produit |
| Agrément DGI éditeur/intégrateur | **non** `[V]` | à obtenir |
| Identités jointes (1 personne ↔ N wallets ↔ 1 banque) | **0** | c'est le moat |
| Mois d'historique certifié par l'État, par client | **0** | l'actif qui compose |
| Entreprises mises en conformité | **0** | 51 000 à prendre |

Sur ces cinq lignes, tout le monde est à zéro. **C'est la seule course où on
part en même temps que les autres.**

---

## 3. La V2 — d'abord la définition, ensuite les chiffres

### 3.1 Ce qu'on appelle V2

**V1** (en cours) : le cerveau branché sur un rail partenaire, en modèle sponsor.
On facture l'abonnement, on émet les FNE, on rapproche. Les fonds vivent chez le
partenaire licencié.

**V2** = trois choses ensemble, aucune ne valant seule :

1. **L'agrément DGI éditeur/intégrateur** — SwimPay validé une fois pour tous ses
   clients. C'est ce qui transforme la facturation d'un service pénible (une clé
   API par marchand) en un produit qui s'installe en dix minutes.
2. **La licence propre BCEAO** (Établissement de Paiement) ou un contrat de
   distribution signé avec un émetteur. C'est ce qui rend les soldes clients
   légaux et supprime la part d'agrégateur sur chaque flux.
3. **La couche de traçabilité ouverte à l'État** (§5). C'est ce qui fait passer
   SwimPay du statut de fournisseur à celui d'infrastructure.

Horizon retenu : **24 mois, mi-2028**, cohérent avec la trajectoire écrite en
`06_PROJET_SWIMPAY.md` §9 et §11.

### 3.2 La projection, avec sa dérivation

Tout ce tableau est `[H]`. Chaque chiffre montre d'où il sort. Un chiffre dont
on ne peut pas montrer la dérivation ne va pas dans un deck.

| | Julaya mi-2028 | SwimPay V2 mi-2028 | Comment on obtient le chiffre SwimPay |
|---|---|---|---|
| Entreprises clientes | 2 000 – 3 000 `[H]` | **600 – 1 200** `[H]` | `06` §9 donne 200-300 payants au mois 12 ; même pente sur 12 mois de plus |
| Flux traités | hors de portée | **non retenu comme objectif** | on ne se mesure pas là-dessus |
| Factures certifiées / an | **0**, sauf virage stratégique | **700 k – 1,4 M** `[H]` | 900 clients × 65-130 factures/mois × 12 |
| Identités jointes | **0** | **30 k – 120 k** `[H]` | clients des marchands servis, hypothèse basse d'adhésion |
| Agrément DGI | non | **oui — 5ᵉ du pays** | dossier déposable dès la SAS finalisée |
| Agrément BCEAO | oui depuis 2025 | visé, sinon distribution | dépend du capital |
| Rapport à l'État | **investisseur** (CDC-CI au capital) | **fournisseur de registre** | §5 |
| Crédit | annoncé, **non livré** `[T]` | origination sur historique certifié | dépend d'un prêteur licencié |
| Revenu récurrent mensuel | non public | **6 – 12 M FCFA** `[H]` | 900 clients × 8 000 F moyens |

**Les deux lignes qui comptent sont les deux du milieu.** Le reste est du
rattrapage. Les factures certifiées et les identités jointes sont les seules où
l'écart joue dans notre sens, et elles se composent : chaque mois d'historique
certifié vaut plus que le précédent, parce que c'est ce qui rend un client
bancable.

**Le risque de cette projection, dit franchement** : elle suppose que Julaya ne
fait pas le virage FNE. S'il le fait, il a l'argent, les 1 000 clients et
l'antériorité. Le §4.1 dit pourquoi c'est peu probable, et le §6 dit ce qu'on
fait si ça arrive.

---

## 4. Les terrains

### 4.1 Où ne pas se battre — quatre pièges

**Le prix du versement.** Julaya verse à 0,5–1,5 %, alimente le compte par
virement bancaire **gratuitement**, et a Orange Ventures au capital. Nous
paierions 2,00 % à PayDunya. On ne gagne pas une guerre de prix contre un acteur
qui a un actionnaire opérateur et une licence propre. Y aller, c'est brûler du
capital pour lui offrir un argument.

**La paie de masse.** C'est leur cœur, rodé sur huit ans et 700 000 opérations
par an. Les cas limites de la paie (le numéro qui a changé, l'employé qui n'a pas
de compte, le versement qui échoue le 28 du mois) s'apprennent en production, pas
en spécification.

**La couverture géographique.** Quatre pays contre zéro. Un argument que tout
directeur financier vérifie en premier.

**Le compte pro et la trésorerie.** Multi-entreprises, sous-comptes, niveaux de
validation, RIB : leur produit est bon et complet. Le refaire, c'est arriver
deuxième sur un terrain occupé.

### 4.2 Terrain 1 — La boucle fiscale

**C'est le terrain principal.** Tout ce qui est vérifié au §1.4 et §1.5 y
converge : une obligation légale datée du 1ᵉʳ décembre 2025, sanctionnée par le
blocage de l'attestation de régularité fiscale, 52 000 entreprises inscrites,
quatre intégrateurs agréés qui sont tous des revendeurs de logiciels comptables,
zéro opérateur de paiement, et une liste qui n'a pas bougé depuis neuf mois.

La proposition tient en une phrase : **l'argent qui rentre écrit la facture
lui-même.** Un revendeur de SAGE ne peut pas la tenir, parce qu'il ne voit pas
l'encaissement. Julaya ne peut pas la tenir aujourd'hui, parce qu'il ne parle pas
à la DGI.

**La condition technique**, et elle n'est pas triviale : pour écrire une facture
tout seul, il faut savoir si le marchand a le **droit** de facturer la TVA. La
règle, les seuils et les dispenses sont établis en source primaire dans
`12_ASSUJETTISSEMENT_TVA_ET_FNE.md`. Une question y reste bloquante et doit
partir à la DGI avant toute ligne de code du moteur.

**Ce qu'on fait** : déposer le dossier d'agrément éditeur/intégrateur dès que la
SAS est finalisée (formulaire officiel, RCCM, NCC, attestation de régularité
fiscale de moins de 3 mois, CNPS ; dépôt à Marcory zone 4 ou
`agrement.fne@dgi.gouv.ci`). En attendant la décision du comité, on opère par la
voie « une clé par marchand », qui fonctionne déjà.

### 4.3 Terrain 2 — Le sens de la flèche

Toute la grille de Julaya décrit de l'argent **qui sort** : transferts groupés,
salaires, factures fournisseurs, virements. Leur client type est le **DAF qui
paie**. Ils le disent eux-mêmes : « +1 000 DAF/DG ».

Le commerçant qui **reçoit** de l'argent n'est pas leur client. Or c'est lui qui
a l'obligation de facturer, lui qui a besoin qu'on rapproche ses encaissements de
ses ventes, lui qui n'a pas de DAF pour le faire à sa place.

**Encaisser → facturer → rapprocher** est un autre produit, pour une autre
personne, avec une autre douleur. Ce n'est pas une variante de leur offre.

### 4.4 Terrain 3 — L'économie du modèle de prix

C'est le terrain le plus profond, parce qu'il n'est pas un choix qu'ils peuvent
défaire facilement.

Julaya facture un **pourcentage du volume**. Prenons un petit commerçant qui fait
200 000 F par mois :

- Pour Julaya, à 1 %, ce client vaut **2 000 F par mois**. Le coût d'acquisition
  et de support dépasse largement cette somme. Ils ne peuvent pas aller le
  chercher, et ils ont raison de ne pas le faire.
- Pour SwimPay, à **2 500 – 10 000 F d'abonnement**, ce même client vaut plus
  cher qu'il ne vaudrait chez eux — parce qu'on ne lui vend pas du transport,
  on lui vend de la conformité et de la mémoire.

**Le modèle de prix de Julaya l'exclut structurellement du bas du marché.**
Basculer à l'abonnement cannibaliserait leur revenu au pourcentage sur les gros
comptes, qui est précisément ce qui les fait vivre. C'est le genre de virage
qu'une entreprise de huit ans avec 1 000 clients ne fait pas de gaieté de cœur.

### 4.5 Terrain 4 — Le comptable comme canal

Un comptable ivoirien tient 20 à 50 dossiers. Le convaincre, c'est atteindre 20 à
50 entreprises d'un coup, avec la crédibilité de quelqu'un que le client paie
déjà pour ces sujets.

Julaya vend au DAF, un par un. Un « export comptable » n'est pas une console
multi-dossiers : c'est un fichier. Rien dans leur produit ne s'adresse au
comptable comme utilisateur.

**Attention à ne pas se mentir** : le comptable est un **canal d'acquisition**,
pas un produit et pas une source de revenu directe. La console lui est offerte
sous 10 dossiers pour qu'il l'installe chez ses clients. Le revenu vient des
entreprises.

### 4.6 Terrain 5 — La donnée certifiée, et le crédit qu'elle ouvre

Un historique de paiements prouve que de l'argent a bougé. Un historique de
**factures certifiées** prouve un **chiffre d'affaires**, parce que l'État l'a
signé, numéro officiel et QR à l'appui.

C'est la différence entre un relevé et un dossier bancable. Douze mois de
recettes certifiées, c'est ce qu'un prêteur peut regarder — et c'est ce que ni
Wave, ni Orange, ni Julaya n'ont sur le petit commerce.

`04_PROBLEM_MAP.md` note que le crédit PME de Julaya est **annoncé mais pas
livré** `[T]`. Djamo a l'agrément microfinance et peut prêter, mais sert le grand
public, pas le marchand. La fenêtre est réelle, et elle se ferme quand quelqu'un
accumule douze mois d'historique certifié avant nous.

---

## 5. L'élément distinctif — le plan de traçabilité

C'est ce qui distingue SwimPay de tout le reste du document. Les terrains du §4
sont des avantages commerciaux : ils s'érodent. Celui-ci est une **position
institutionnelle** : il se renforce.

### 5.1 Ce que l'État a déjà construit, et ce qui lui manque

L'État ivoirien a bâti deux registres, séparément, et les deux fonctionnent.

| Registre | Tenu par | Ce qu'il contient | Statut |
|---|---|---|---|
| **RNPP / NNI** | ONECI (décret 2019-458) | Un **Numéro National d'Identification** personnel, sécurisé, permanent, par citoyen | `[T]` en déploiement, adossé à la CNI biométrique |
| **FNE / NCC** | DGI | Chaque vente certifiée d'une entreprise, numéro officiel et QR | `[V]` obligatoire depuis le 1ᵉʳ déc. 2025 |

Ce qui manque entre les deux, et que personne ne tient :

> **Le lien entre un citoyen et son argent.**
>
> Un Ivoirien a un compte Orange Money, un compte Wave, parfois MTN ou Moov, et
> peut-être un compte bancaire. **Aucun registre ne sait que c'est la même
> personne.** Pour l'État, ce citoyen est quatre inconnus qui ne se croisent
> jamais.

L'État ne peut pas construire ce lien lui-même : il faudrait que les opérateurs
acceptent de joindre leurs registres. Ils ne le feront pas — ce sont des jardins
fermés, et leur fermeture est leur avantage concurrentiel. L'État peut obliger à
facturer, il l'a fait. Il ne peut pas obliger Wave et Orange à se dire qui est
qui.

**SwimPay est la table de jointure entre le registre des personnes et l'argent.**
C'est ça, la vision « un citoyen, N numéros, une banque » de `00_VISION.md`, dite
avec le vocabulaire de l'État.

### 5.2 Le triplet que personne d'autre ne détient

| Acteur | Le mouvement | L'identité jointe | La vente certifiée |
|---|---|---|---|
| Wave, Orange, MTN, Moov | oui, chez eux seulement | non | non |
| DGI | non | non | **oui** |
| ONECI | non | **oui**, mais sans l'argent | non |
| Julaya | oui | non | **non** `[V]` |
| Banques | oui, chez elles | partiellement | non |
| **SwimPay** | **oui** (le brin, migration 039) | **oui** (l'annuaire) | **oui** (module FNE, 040) |

Chacun détient un ou deux morceaux. **Le triplet complet n'existe nulle part.**
Et c'est le triplet qui a de la valeur, pas les morceaux : savoir qu'un montant a
bougé ne sert à rien si on ne sait ni de qui il s'agit ni à quoi il correspond.

Techniquement, les trois morceaux sont déjà posés dans le schéma : le brin est
**append-only**, sa clé dérive de son contenu, et il relie exactement deux
porteurs. Un registre qui ne peut pas être réécrit est la condition pour qu'un
tiers puisse s'y fier. C'est déjà construit et déjà prouvé — c'est la partie
faite.

### 5.3 Les six niveaux du robinet

Le mot « traçabilité » ne veut rien dire tant qu'on n'a pas dit **qui voit quoi,
sous quelle condition**. Voici la conception proposée.

| Niveau | Qui voit quoi | Condition d'ouverture | État |
|---|---|---|---|
| **0 — La facture** | La DGI voit chaque vente certifiée | Déjà obligatoire (arrêté 0337) | **livré** (040) |
| **1 — Le brin** | Personne à l'extérieur. Registre interne inaltérable | — | **livré** (039) |
| **2 — L'identité jointe** | Personne à l'extérieur. SwimPay sait que ces 4 numéros sont un NNI | Déclaration ARTCI | à construire |
| **3 — L'attestation** | Le tiers que **le titulaire** choisit : sa banque, son bailleur, la DGI | **Consentement du titulaire**, révocable | à construire |
| **4 — L'agrégat** | L'État voit des masses : par secteur, par commune, par tranche. **Jamais un nom** | Convention + déclaration ARTCI | à construire |
| **5 — La levée nominative** | L'État voit un nom | **Réquisition écrite ou contrôle fiscal ouvert**, motif obligatoire | à construire |

Le niveau 3 est le cœur commercial : c'est le citoyen qui ouvre son propre
dossier, à qui il veut, quand il veut. Le niveau 4 est le cœur institutionnel :
l'État obtient enfin une vue non fragmentée de l'économie réelle, sans que
personne ne soit nommé.

### 5.4 La règle qui rend l'ensemble acceptable

> **Chaque accès de l'État est lui-même un brin.**

Horodaté, motivé, append-only, non effaçable, consultable par un auditeur
indépendant et par le titulaire. **L'État qui regarde est regardé.**

Ce n'est pas une concession morale, c'est la condition de survie du produit. Un
outil dont les utilisateurs pensent qu'il rapporte tout à l'administration ne se
fait pas adopter par des commerçants dont une partie de l'activité est informelle
par nécessité. Sans cette règle, on construit un instrument de surveillance et
personne ne s'y inscrit. Avec elle, on construit un registre de confiance, et
c'est exactement ce qui manque au pays.

C'est aussi ce qui nous protège : le jour où une demande abusive arrive, la
réponse n'est pas un arbitrage politique, c'est une règle technique écrite dans
le schéma, opposable à tout le monde y compris à nous.

### 5.5 Ce que le citoyen reçoit en échange

Un registre auquel on ne donne rien en retour ne se remplit pas. Les trois
contreparties, dans l'ordre de ce qu'elles valent pour lui :

1. **Un dossier de revenus qui lui ouvre un crédit.** Aujourd'hui, un commerçant
   qui veut emprunter n'a rien à montrer. Douze mois de recettes certifiées par
   l'État, c'est le premier document bancable de sa vie.
2. **L'attestation de régularité fiscale, automatiquement.** Sans elle, il est
   exclu des marchés publics. Avec la FNE tenue à jour, elle vient toute seule.
3. **Un seul endroit où retrouver ce qu'il a envoyé et reçu**, tous réseaux
   confondus. Aujourd'hui il faut ouvrir quatre applications et ne rien pouvoir
   additionner.

**L'échange doit être écrit noir sur blanc dans le produit et dans le discours.**
« On trace vos flux » ne se vend pas. « Vous devenez emprunteable » se vend.

### 5.6 Pourquoi c'est difficile à copier

- **Wave et Orange** : jardins fermés. Joindre les identités avec un concurrent
  détruirait leur avantage. Ils ne le feront pas.
- **Julaya** : n'a ni la facture certifiée `[V]`, ni l'ancrage d'identité. Et son
  actionnaire **Orange Ventures est précisément l'un des jardins fermés** —
  construire une couche neutre au-dessus d'Orange avec Orange au capital est un
  conflit qui ne se résout pas par la technique.
- **La DGI** : peut obliger à facturer, elle l'a fait. Elle ne peut pas obliger
  les opérateurs à partager l'identité financière de leurs clients.
- **Un nouvel entrant** : devrait accumuler l'historique certifié depuis zéro. Le
  temps est la barrière, et il ne s'achète pas.

### 5.7 Le chemin réglementaire, dans l'ordre

1. **Déclaration ARTCI.** La loi n° **2013-450 du 19 juin 2013** relative à la
   protection des données à caractère personnel désigne l'ARTCI comme autorité de
   protection, et impose la **déclaration préalable de tout traitement** `[T]`.
   L'annuaire d'identité est un traitement au sens de cette loi. À faire **avant**
   le niveau 2, pas après.
2. **Agrément DGI éditeur/intégrateur.** Le canal institutionnel qui a un besoin
   opérationnel immédiat et seulement quatre fournisseurs.
3. **Convention de données agrégées** avec la DGI, puis éventuellement le
   ministère des Finances. Niveau 4 seulement, jamais le 5 par défaut.
4. **Agrément BCEAO** ou contrat de distribution, en parallèle.

**Par où entrer** : par la **DGI**, pas par le ministère. La DGI a un problème
qu'elle nomme elle-même, une plateforme en production, et quatre intégrateurs qui
ne savent pas encaisser. C'est une conversation technique, pas politique.

### 5.8 Les risques, dits franchement

**Le risque de réputation est le plus grave.** « SwimPay dit tout à l'État » est
une phrase qui, si elle s'installe, tue le produit chez les marchands. La
conception du §5.3 et l'échange du §5.5 sont la réponse, mais ils ne valent que
s'ils sont **dits publiquement et avant** que la rumeur ne les précède.

**Le risque politique** : CDC-CI Capital, bras d'investissement de l'État, est
déjà au capital de Julaya `[V]`. L'État a donc déjà choisi un champion des
paiements. Cela n'interdit pas la traçabilité — ce n'est pas le même métier —
mais cela signifie que **le canal institutionnel de Julaya est ouvert avant le
nôtre**. Il faut le savoir en entrant dans la pièce.

**Le risque de captation** : si l'État devient le client principal, il peut aussi
décider de faire construire la même chose par quelqu'un d'autre. La protection
n'est pas contractuelle, elle est dans l'antériorité de l'historique certifié et
dans le fait que les données appartiennent aux titulaires, pas à nous.

**Le risque d'exécution** : rien du niveau 2 au niveau 5 n'est construit. Les
niveaux 0 et 1 le sont. C'est un plan, pas un produit.

---

## 6. Ce qui se décide, et ce qui reste inconnu

### 6.1 Ce que LO doit arbitrer

1. **Le partenaire de lancement.** Julaya est 2,8 fois moins cher que PayDunya
   sur la paie du prototype (17 400 F contre 49 300 F, `10_JULAYA_TARIFS.md`) —
   et c'est un **concurrent direct** sur le B2B. Payer un concurrent pour qu'il
   nous transporte, c'est aussi lui montrer nos volumes, nos marchands et nos
   usages. PayDunya coûte cher mais ne vend pas de produit PME concurrent.
   *Cet arbitrage reste ouvert et ne se réduit pas au prix.*
2. **Le « direct » en V1.** Est-ce qu'un transfert entre deux comptes SwimPay
   passe par le partenaire (`direct-pay/credit-account` chez PayDunya,
   inter-entreprises chez Julaya) dès la V1, ou est-ce un comportement de phase 2 ?
   Le site le promet déjà. *Question posée, non tranchée.*
3. **Le niveau de traçabilité annoncé publiquement dès le départ.** Tout dire dès
   le premier jour rassure l'État et inquiète le marchand. Ne rien dire fait
   l'inverse, et expose à la rumeur. *Position à choisir avant la première
   communication.*

### 6.2 Ce qu'on ne sait pas encore

- **Le vrai volume de Julaya** et la période qu'il couvre (§1.2).
- **Leur grille négociée** : les publics vont de 0,5 % à 1,5 %, on ignore les
  seuils exacts de volume qui font basculer.
- **Leur effectif et leur chiffre d'affaires** : non publiés.
- **S'ils préparent la FNE.** Aucune trace publique aujourd'hui `[V]`, ce qui ne
  prouve rien sur leur feuille de route. À surveiller : toute apparition de
  Julaya dans une prochaine liste d'agréés DGI est le signal d'alerte le plus
  important de tout ce document.
- **Le délai réel du comité d'agrément FNE.** La liste n'a pas bougé depuis neuf
  mois : on ne sait pas si c'est parce que personne ne demande, ou parce que le
  comité ne siège pas.

---

## 7. Sources

Primaires, relevées le 29 août 2026 avec un Chrome réel, copies dans `assets/` :

- `julaya.co/fr` — chiffres clés, navigation, absence de FNE/DGI/crédit
- `julaya.co/fr/prices` — grille CI (`assets/julaya-prices-ci-2026-08-29.png`)
- `paydunya.com/service-fees` (`assets/paydunya-service-fees-2026-08-29.png`)
- **DGI, liste des entreprises agréées FNE, n° 0008/MFB/DGI-CAB/CT/KY du
  28 novembre 2025** (`assets/entreprises_agrees_FNE.pdf`, rendu
  `assets/dgi-agrees-fne-28nov2025.png`)
- DGI, procédure d'interfaçage par API, mai 2025
  (`assets/FNE-procedureapi-mai-2025.pdf`)
- DGI, guide utilisateur FNE, 45 p. (`assets/FNE-guide-utilisateur.pdf`)
- DGI, présentation, historique, imprimeurs agréés (`assets/FNE-*.pdf`)

Tierces :

- Agence Ecofin, 21 oct. 2025 — financement CDC-CI, 1 000 entreprises clientes
- KOACI, 17 oct. 2025 — 1 000 Md FCFA de flux, présence Sénégal et Bénin
- Abidjan.net / gouv.ci, févr. 2026 — 52 000 entreprises inscrites à la FNE
- ONECI — NNI, RNPP, décret n° 2019-458 du 22 mai 2019
- ARTCI — loi n° 2013-450 du 19 juin 2013, protection des données personnelles

Internes : `00_VISION.md`, `04_PROBLEM_MAP.md`, `06_PROJET_SWIMPAY.md`,
`08_DGI_FNE_API.md`, `09_PAYDUNYA_TARIFS.md`, `10_JULAYA_TARIFS.md`,
migrations 037 à 040.
