# Qui facture la TVA, qui ne la facture pas — et ce que ça impose au moteur de factures

> **Pourquoi ce document existe.** Le champ `items[].taxes` de la FNE est
> **obligatoire**. Pour l'écrire tout seul, SwimPay doit savoir si le marchand a
> le **droit** de facturer la TVA. Se tromper n'est pas un défaut d'affichage :
> **facturer la TVA sans y être autorisé fait commettre une infraction fiscale à
> notre client**, sous notre signature et avec le numéro officiel de la DGI
> dessus.
>
> Tout ce qui suit est `[V]`, relevé le 29 août 2026 dans deux sources primaires
> de la DGI, copiées dans `assets/` :
> `DGI-systeme-fiscal-ivoirien.pdf` (70 p., pages rendues en images) et la page
> `fne.dgi.gouv.ci/entreprises.php`.

---

## 1. Les quatre régimes, et la ligne de partage de la TVA

Le dispositif légal comprend **quatre régimes d'imposition**, déterminés par un
seul critère : le **chiffre d'affaires annuel toutes taxes comprises**.

| Régime | CA annuel TTC | Taux de l'impôt | **Facture la TVA ?** | Article |
|---|---|---|---|---|
| **RE** — Taxe communale de l'entreprenant | ≤ **5 000 000** | 2 % négoce · 2,5 % autres | **NON** | ord. 61-123, ann. fiscale 2021 |
| **RE** — Taxe d'État de l'entreprenant | **5 000 001 – 50 000 000** | 5 % · **4 %** négoce · **moitié** si CGA | **NON** | art. 72 et s. CGI |
| **RME** — Microentreprises | **50 000 001 – 200 000 000** | 6 % · **4 %** si CGA ou expert-comptable conventionné | **NON** | art. 71 bis CGI |
| **RSI** — Réel simplifié | **200 000 001 – 500 000 000** | régime réel | **OUI** | art. 45 CGI |
| **RNI** — Réel normal | **> 500 000 000** | régime réel | **OUI** | art. 34 CGI |

> ### La frontière est à 200 000 001 francs de chiffre d'affaires annuel TTC.

### Les deux phrases qui tranchent, mot pour mot

Sur la taxe d'État de l'entreprenant (p. 3, `assets/dgi-regimes-p3-entreprenant.png`) :

> « Cette taxe **se substitue à la patente, à l'impôt sur les bénéfices et à la
> taxe sur la valeur ajoutée**. »

Sur les microentreprises (p. 9, `assets/dgi-regimes-p9-rme-tva-et-rsi.png`) :

> « **NB :** Les contribuables soumis à l'impôt des microentreprises **ne sont pas
> autorisés à facturer la taxe sur la valeur ajoutée, ni à transmettre un droit à
> déduction**. »

Il n'y a pas d'interprétation à faire. C'est une interdiction écrite.

### Les assujettis volontaires — la seule exception

Le CGI distingue les **assujettis obligatoires (de droit)** et les **assujettis
volontaires**, « ceux qui demandent à être placés sous le régime de la TVA ».

Un contribuable au RME **peut opter** pour le réel simplifié :

- l'option se lève **avant le 1ᵉʳ février** de chaque année ;
- elle **prend effet au 1ᵉʳ janvier** de l'année où elle est exercée ;
- elle **n'est révocable qu'après trois ans**, et sur autorisation expresse de la DGI.

**Conséquence pour le produit** : le chiffre d'affaires **ne suffit pas** à
déterminer si un marchand facture la TVA. Un marchand à 80 M de CA peut être
assujetti par option. Le statut TVA doit être une **donnée du dossier client**,
saisie et datée, pas une valeur calculée depuis le CA.

### Les seuils ne basculent pas dans les deux sens à la même vitesse

Règle répétée pour chaque régime : une entreprise dont le CA **descend** sous un
seuil ne change de régime **qu'après trois exercices consécutifs** sous ce seuil.
Vers le haut, le basculement est immédiat.

Un moteur qui recalculerait le régime chaque année à partir du CA se tromperait
dans un sens sur deux. **Le régime est un état qui se transitionne, pas un
calcul.**

---

## 2. Qui est dispensé de la FNE

Source : `fne.dgi.gouv.ci/entreprises.php`, « Liste des opérations dispensées »,
relevée le 29 août 2026 `[V]`. Douze catégories, et rien d'autre :

1. Entreprises concessionnaires de service public d'**eau, d'électricité et du
   téléphone**
2. **Pharmacies**
3. Concessionnaire de service public chargé de l'**identification des personnes**
4. **Compagnies aériennes**
5. Entreprises **pétrolières** bénéficiant de contrats de partage de production
6. **Stations-services**, uniquement pour leurs ventes de **carburant**
7. **La Poste de Côte d'Ivoire**
8. **Banques**
9. **Compagnies d'assurance**
10. Concessionnaires de service de **transport**, pour les opérations couvertes
    par la concession
11. Entreprises de **transport non concessionnaires** n'ayant **pas opté** pour
    l'assujettissement à la TVA
12. Entreprises **sans installation professionnelle** en Côte d'Ivoire

**À lire attentivement, deux pièges** :

- **La dispense est parfois partielle.** Une station-service est dispensée
  *uniquement pour le carburant*. Sa boutique, son lavage, sa vidange doivent
  émettre une FNE. La dispense se porte sur **l'opération**, pas sur
  l'entreprise. Le modèle de données doit donc porter le drapeau au niveau de la
  **ligne**, pas du marchand.
- **La ligne 11 relie les deux sujets.** Un transporteur non concessionnaire est
  dispensé de FNE *tant qu'il n'a pas opté pour la TVA*. Le jour où il opte, il
  entre dans la FNE. Statut TVA et obligation FNE sont **liés**.

---

## 3. Les taux, et les codes de la FNE

| Situation | Taux | Code FNE `items[].taxes` | Base |
|---|---|---|---|
| Taux normal | **18 %** | `TVA` | art. 339 et s. CGI |
| Taux réduit | **9 %** | `TVAB` | art. 359 CGI, liste limitative (lait hors yaourts, lait infantile, pâtes 100 % semoule de blé dur, viande et poisson de luxe) |
| Exonération conventionnelle | 0 % | `TVAC` | conventions |
| Exonération légale | 0 % | `TVAD` | art. 355, 356, 357 CGI |

Autres articles à connaître pour le moteur : **339** (opérations imposables par
nature), **346** (imposables par disposition expresse : importations, transports
spécialisés, lotisseurs, marchands de biens), **348**, et **355 à 357**
(exonérations).

### Le cas du non-assujetti : la DGI l'a prévu

**La FNE ne dépend pas de la TVA.** Depuis le 1ᵉʳ décembre 2025, l'émission est
obligatoire pour **toutes** les entreprises, **sans exception de régime fiscal**.
KOMPTO, l'un des quatre intégrateurs agréés, l'écrit noir sur blanc `[T]` :

> « Toutes les entreprises opérant en Côte d'Ivoire doivent donc aujourd'hui
> émettre leurs factures en format FNE conforme, **sans exception liée à
> l'assujettissement à la TVA**. »

**Le mécanisme est simple** : le non-assujetti facture **hors taxes** et porte la
mention légale **« TVA non applicable »**. Sur la plateforme web de la DGI, cela
revient à ne pas cocher la TVA. C'est ce que font les praticiens aujourd'hui.

### Le code exact, et la DGI l'avait nommé

La liste déroulante « Taux d'imposition » de la plateforme, reproduite dans le
guide utilisateur officiel (p. 31, `assets/fne-guide-p31-taux-imposition.png`),
donne les cinq choix **avec leur lettre** :

| Libellé exact dans la plateforme | Lettre | Code API |
|---|---|---|
| TVA normal — TVA sur HT 18,00 % | **A** | `TVA` |
| TVA réduite — TVA sur HT 09,00 % | **B** | `TVAB` |
| TVA exo.conv — TVA sur HT 00,00 % | **C** | `TVAC` |
| **TVA exo.lég — Pas de TVA sur HT 00,00 % — (TEE, TCE, Microentreprise)** | **D** | **`TVAD`** |
| TVA exo export — TVA sur HT | — | (export) |

La ligne D porte, **écrit par la DGI elle-même**, la liste des régimes concernés :

> `TVA exo.lég - Pas de TVA sur HT 00,00% - D (TEE, TCE, Microentreprise)`

**TEE** = taxe d'État de l'entreprenant · **TCE** = taxe communale de
l'entreprenant · **Microentreprise** = RME. Ce sont exactement les trois régimes
non assujettis du §1.

**La question est close. Le code est `TVAD`, et il n'y a rien à demander.**

> **Note d'honnêteté.** La première version de ce document qualifiait ce point de
> « bloquant » et en faisait la question numéro un à poser à la DGI. C'était faux
> deux fois : j'avais déduit un trou depuis le schéma de l'API sans vérifier la
> pratique, **et la réponse était depuis le début dans un guide de 45 pages déjà
> téléchargé dans le repo, que je n'avais pas ouvert.** Lire ce qu'on a avant de
> conclure ce qu'on n'a pas. La règle de fond du §1 reste entière : un non-assujetti
> ne facture jamais la TVA.

---

## 4. Comment SwimPay peut savoir — et ce qu'on a mesuré

### 4.1 Il existe un service officiel de consultation du NCC

`e-impots.gouv.ci/index/verifier-ncc` — « CONSULTATION D'UN NCC ». On y saisit un
NCC **ou** une raison sociale.

Sonde du 29 août 2026, avec un Chrome réel `[V]` :

```
POST https://e-impots.gouv.ci/index/verifier-ncc
corps : ncc=2500583F&raisonSociale=&g-recaptcha-response=
```

Le formulaire porte trois champs : `ncc`, `raisonSociale`, `valider` — et la
soumission emporte un **`g-recaptcha-response`**.

> **Ce service est protégé par reCAPTCHA. Ce n'est pas une API.**

La sonde a soumis un NCC dont je connaissais déjà la réponse — `2500583F` =
PROGICI SARL, lu sur la liste officielle des agréés FNE du 28 novembre 2025 — et
la page est revenue **sans le nom attendu**. C'est le contrôle de calibrage qui
le dit : la requête a bien été rejetée, faute de jeton reCAPTCHA. Le service
fonctionne, il est simplement fermé aux machines.

Version relevée du portail : **e-impôts 3.7.2, dernière livraison le 06/03/2026**.

**Conséquence** : SwimPay ne peut pas vérifier un NCC automatiquement aujourd'hui.
Trois voies, et une seule est bonne :

| Voie | Coût | Verdict |
|---|---|---|
| Demander un accès machine à la DGI, dans le dossier d'agrément éditeur | un échange | **la bonne** |
| Envoyer la facture et lire l'erreur | **risque de brûler un sticker** (20 F) sur un NCC faux | mauvaise |
| Faire vérifier le NCC par le marchand à l'inscription, et le dater | zéro | **acceptable en attendant** |

### 4.2 Attention : le NCC est en train d'être remplacé

Plusieurs sources tierces signalent une transition vers un **Identifiant Unique
(IDU)** en 2026 `[T]`. Le schéma de la FNE, lui, parle toujours de `clientNcc`.
**À vérifier auprès de la DGI avant de figer le modèle de données** : un
changement d'identifiant national touche l'annuaire, les factures et le
rapprochement en même temps.

---

## 5. Ce que ça impose au moteur de factures

Sept règles, dont trois sont des interdictions.

1. **Le statut TVA est une donnée du dossier, pas un calcul.** Elle porte : le
   régime, sa date d'effet, et si l'assujettissement vient de la loi ou d'une
   option. Un CA seul ne suffit jamais (§1).
2. **Interdiction : jamais de TVA sur une facture d'un non-assujetti.** Le moteur
   doit refuser d'émettre, pas corriger en silence. Un blocage se voit ; une
   correction silencieuse se découvre au contrôle fiscal.
3. **Interdiction : jamais de FNE sur une opération dispensée.** Le drapeau vit
   sur la **ligne**, pas sur le marchand (le carburant de la station-service).
4. **Interdiction : jamais de retry aveugle après un timeout.** Règle déjà écrite
   dans `08_DGI_FNE_API.md` ; elle vaut ici aussi, parce qu'un NCC douteux plus un
   retry, c'est deux stickers brûlés au lieu d'un.
5. **Le régime est une machine à états.** Montée immédiate au franchissement,
   descente seulement après trois exercices consécutifs sous le seuil.
6. **Le calendrier fait partie du produit.** L'option pour le réel simplifié se
   lève **avant le 1ᵉʳ février** ; l'adhésion à un CGA, **avant le 31 janvier**
   (30 jours pour une nouvelle immatriculation). Une alerte en janvier vaut de
   l'argent réel pour le client.
7. **Tout changement de régime est un événement, écrit et daté.** Comme le brin :
   append-only. C'est ce qui permettra, trois ans plus tard, de prouver pourquoi
   telle facture portait tel taux.

### Décision de périmètre V1 : un seul chemin de TVA

**La V1 ne démarche que des clients sous 200 M de chiffre d'affaires** (décision
LO, 29 août 2026). Conséquence directe sur le moteur, et elle est excellente :

- **un seul chemin de TVA à écrire** — celui du non-assujetti, hors taxes avec la
  mention « TVA non applicable » ;
- les règles 1, 5 et 6 ci-dessus (statut en dossier, machine à états, calendrier
  des options) restent **écrites mais dormantes** : on enregistre le régime dès le
  premier jour, on ne l'exerce pas encore ;
- la règle 2 devient une **garde en dur** : au-delà du seuil, le moteur refuse et
  passe la main, plutôt que d'improviser un chemin non testé.

C'est le bon découpage. Le segment visé est aussi celui que Julaya ne peut pas
servir (`11_JULAYA_ET_LA_V2.md` §4.4) : le périmètre technique le plus simple est
aussi le terrain commercial le plus défendable.

### Le produit que personne d'autre ne peut vendre

SwimPay **voit le chiffre d'affaires en train de se faire**, puisqu'il encaisse.
Il peut donc dire, en octobre :

> « Vous êtes à 178 millions. Au-delà de 200, vous basculez au réel simplifié et
> vous devrez facturer la TVA. Voici ce que ça change. »

Et aussi :

> « Vous payez 6 %. En adhérant à un Centre de Gestion Agréé avant le 31 janvier,
> vous payez 4 %. Sur votre chiffre d'affaires, cela fait *tant* par an. »

Un revendeur de SAGE ne peut pas dire ça : il ne voit pas les encaissements en
temps réel. Julaya ne peut pas le dire : il ne parle pas à la DGI `[V]`. C'est
exactement le croisement décrit en `11_JULAYA_ET_LA_V2.md` §4.2, rendu concret.

### Et la règle s'applique à nous

À 900 clients × 8 000 F par mois, SwimPay ferait environ **86 M FCFA de chiffre
d'affaires annuel**. Nous serions nous-mêmes au **régime des microentreprises** —
donc **sans droit de facturer la TVA à nos propres clients**, jusqu'à franchir
200 millions ou opter. À intégrer à la grille tarifaire avant la première facture,
pas après.

---

## 6. Les questions à poser à la DGI

À adresser à `support.fne@dgi.gouv.ci` et `agrement.fne@dgi.gouv.ci`, en même
temps que le dossier d'agrément :

1. **Confirmation** du code `taxes` retenu pour une entreprise non assujettie —
   à poser **après** le test en bac à sable (§3), pour faire valider notre choix,
   pas pour le découvrir.
2. Existe-t-il un **accès machine** à la consultation du NCC, réservé aux éditeurs
   agréés ? Le formulaire public est protégé par reCAPTCHA.
3. La réponse à cette consultation donne-t-elle le **régime fiscal** et le
   **statut TVA**, ou seulement la raison sociale ?
4. **Le NCC est-il remplacé par l'IDU**, selon quel calendrier, et le champ
   `clientNcc` de la FNE change-t-il ?
5. Une facture émise avec un **NCC client invalide** consomme-t-elle un sticker,
   ou est-elle rejetée avant ?
6. Pour une **station-service** (ligne 6 de la liste des dispenses), comment se
   déclare une facture mixte carburant plus boutique ?
7. Un **transporteur non concessionnaire qui opte pour la TVA** (ligne 11) entre-t-il
   dans la FNE à la date d'effet de l'option, ou au 1ᵉʳ janvier suivant ?

---

## 7. Réponse directe à la question posée

> *« Recherche les entreprises assujetties à la TVA et celles qui ne le sont pas. »*

**Il n'existe pas de liste nominative téléchargeable en Côte d'Ivoire.** Le Bénin
en publie une ; la DGI ivoirienne, non. Le portail FNE publie six documents
(procédure API, guide utilisateur, présentation, historique, imprimeurs agréés,
entreprises agréées) — tous archivés dans `assets/` — et **aucun** n'est une liste
d'assujettis.

Ce qui existe à la place, et qui vaut mieux qu'une liste :

1. **Une règle**, celle du §1, qui donne la réponse pour n'importe quelle
   entreprise à partir de son chiffre d'affaires et de son éventuelle option.
2. **Une liste de dispenses**, celle du §2, courte et fermée.
3. **Un bac a sable public et gratuit** pour trancher les details de correspondance sans attendre personne.
4. **Une consultation unitaire officielle**, celle du §4, aujourd'hui fermée aux
   machines.

Une liste aurait été périmée le mois suivant. La règle, elle, ne périme pas — et
c'est elle qu'on met dans le code.

---

## 8. Le montage : couche de facturation, jamais vendeur

Une idée revient naturellement : *« et si SwimPay devenait simplement la couche
qui facture tel article à telle entreprise, pour toutes nos PME ? »* Elle est
juste dans son intention et dangereuse dans une de ses deux lectures. En
français les deux se disent pareil ; en fiscalité elles diffèrent d'un facteur
cent.

### 8.1 Lecture A — SwimPay émet la facture **au nom** de la PME

Le vendeur reste la PME. La facture porte **son** NCC. SwimPay est l'auteur
technique, sous mandat.

C'est exactement ce que fait un **éditeur/intégrateur agréé**, et c'est déjà le
modèle du repo. Le bénéfice est celui qu'on cherche : **un seul dossier DGI pour
tous nos clients**, au lieu d'une validation par marchand. La FAQ officielle
confirme qu'une entreprise peut s'interfacer elle-même **ou** passer par un
éditeur agréé, et qu'un agréé sert ses clients sans accréditation propre de
chacun (`08_DGI_FNE_API.md` §1).

Côté argent, le modèle pass-through dit déjà la même chose : les sommes
encaissées pour le compte d'un tiers ne sont **pas** le chiffre d'affaires de
SwimPay.

**C'est la bonne lecture. Elle donne la simplification sans rien coûter.**

### 8.2 Lecture B — SwimPay achète et revend

SwimPay devient le vendeur. La facture porte **le NCC de SwimPay**. C'est le
régime de l'intermédiaire opaque : celui qui s'entremet en son nom propre est
réputé avoir personnellement acquis et livré le bien, et la base d'imposition
est **le montant total de la transaction**, pas la commission.

L'arithmétique, sur l'hypothèse de la V2 (900 clients, 60 M FCFA de CA moyen) :

| | Montant |
|---|---|
| Flux facturé qui deviendrait notre CA | **54 000 000 000 F** |
| Régime imposé | RNI (> 500 M), assujetti **obligatoire** |
| TVA collectée à 18 % | **9 720 000 000 F** |
| TVA déductible en amont | **≈ 0** — nos PME sont au RME et « ne sont pas autorisées à transmettre un droit à déduction » (§1) |
| TVA nette à reverser | **≈ 9,72 milliards par an** |
| Revenu réel de SwimPay | 86 400 000 F par an |

> **La note de TVA vaudrait 112 fois la totalité de notre revenu.**

Le rééquilibrage par le prix du service ne s'applique pas ici : il faudrait
facturer 18 % du flux, soit **900 000 F par mois et par client** au lieu de
8 000. Ce n'est pas un ajustement de tarif, c'est un autre métier.

Et la casse ne s'arrête pas à la fiscalité :

- **On détruit l'actif du projet.** Si SwimPay est le vendeur, la PME n'a **aucun
  chiffre d'affaires certifié**. Le dossier bancable de `11_JULAYA_ET_LA_V2.md`
  §4.6 disparaît, et avec lui le levier crédit.
- **Le graphe d'identité s'effondre sur un seul nœud** : nous. Toute la couche de
  traçabilité (`11` §5) repose sur des arêtes NCC-vendeur → NCC-acheteur. En
  devenant le vendeur unique, on efface les arêtes.
- **On devient juridiquement le marchand** : propriété des biens, garantie,
  conformité produit, et les autorisations sectorielles de chaque activité qu'on
  « vendrait ».

### 8.3 Le point juste de l'intuition : le NCC construit le graphe

`clientNcc` est **obligatoire en B2B**. Chaque facture émise crée donc une arête
vérifiée entre deux entreprises identifiées, datée et montant compris. Fait à
l'échelle, c'est **la carte de qui commerce avec qui** — et elle se construit
gratuitement, comme sous-produit de la facturation.

C'est précisément l'actif décrit en `11` §5.2, et il n'existe que si **chaque
vendeur garde son propre NCC**. La lecture B le détruirait ; la lecture A le
produit.

### 8.4 Le risque de qualification, et sa frontière exacte

L'article 7 de l'annexe fiscale 2022 (loi n° 2021-899) pose que l'opérateur d'une
plateforme numérique est **redevable légal de la TVA due sur les transactions
réalisées sur sa plateforme**, en plus de celle sur ses commissions `[V]`.

**La frontière** : la note explicative de la DGI
(`assets/DGI-note-plateformes-numeriques.pdf`) vise « les plateformes numériques
**qui ne disposent pas d'installations professionnelles sur le territoire** ».
SwimPay, société ivoirienne établie en Côte d'Ivoire, est **hors de ce régime**.

Mais la direction du droit ivoirien est claire, et elle décide du vocabulaire du
produit :

> On dit **« SwimPay émet vos factures en votre nom »**.
> On ne dit **jamais** « SwimPay facture vos clients ».

La deuxième formule invite la qualification d'intermédiaire. Ce n'est pas une
nuance de communication : c'est la phrase qu'un contrôleur lira.

### 8.5 Le vrai montage intelligent : l'option pour le réel simplifié

Il existe un arbitrage réel, et il ne va pas dans un seul sens.

Tant que SwimPay reste au RME, il ne facture pas la TVA — donc il ne **récupère
pas** la TVA sur ses propres achats (serveurs, outils, sous-traitance).

| | SwimPay non assujetti (RME) | SwimPay assujetti (option RSI) |
|---|---|---|
| Client **au RSI/RNI** | paie 8 000 F, ne déduit rien | paie 9 440 F, déduit 1 440 F → **coût net identique** |
| Client **au RME / entreprenant** | paie 8 000 F | paie 9 440 F, **ne déduit rien → +18 % réel** |
| TVA sur nos propres achats | **perdue** | **récupérée** |

L'option n'est donc gagnante que si le revenu se concentre sur des clients
assujettis. Or toute la thèse du projet est d'aller chercher **le bas du marché**
(`11` §4.4), c'est-à-dire des non-assujettis. **Conclusion : rester au RME tant
que la clientèle est majoritairement micro**, et absorber la TVA d'amont perdue
comme un coût. Au-delà de 200 M de CA, la question ne se pose plus : l'assujettissement
devient obligatoire.

Rappel de calendrier : l'option se lève **avant le 1ᵉʳ février**, prend effet au
**1ᵉʳ janvier** de l'année en cours, et **n'est révocable qu'après trois ans**.
C'est une décision annuelle à date fixe, pas un réglage.

---

## 9. Sources

Primaires, relevées le 29 août 2026, copies dans `assets/` :

- **DGI — « Le système fiscal ivoirien »**, 70 p. (`DGI-systeme-fiscal-ivoirien.pdf`).
  Pages rendues en images : `dgi-regimes-p3-entreprenant.png` (les 4 régimes, la
  taxe communale, la substitution à la TVA), `dgi-regimes-p7-microentreprises.png`
  (art. 71 bis, seuils 50–200 M, taux 6 % et 4 %),
  `dgi-regimes-p9-rme-tva-et-rsi.png` (**l'interdiction de facturer la TVA**,
  l'option RSI, art. 45), `dgi-regimes-p11-reel-normal.png` (art. 34, > 500 M).
- **DGI — FNE, « Liste des opérations dispensées »**, `fne.dgi.gouv.ci/entreprises.php`
- **DGI — procédure d'interfaçage par API**, mai 2025 (`FNE-procedureapi-mai-2025.pdf`)
- **DGI — guide utilisateur FNE**, 45 p. (`FNE-guide-utilisateur.pdf`)
- **DGI — note explicative sur les plateformes numériques**, art. 7 annexe fiscale 2022 (`DGI-note-plateformes-numeriques.pdf`)
- **e-impôts 3.7.2** — formulaire de consultation NCC, sondé par CDP
  (`design/pivot/sondes/` pour l'outillage)

Tierces, à confirmer :

- Taux réduit de 9 %, art. 359 CGI, liste limitative
- Transition NCC vers IDU en 2026

Outils écrits pour ce relevé, sans aucune dépendance installée, versés dans
`design/pivot/sondes/` :

- `lire-pdf2.mjs` — extraction de texte d'un PDF par `zlib`, avec insertion
  d'espace au seuil de crénage, **calibrée sur une phrase connue d'avance**
- `pages-pdf.mjs` — rendu de pages précises d'un PDF en images via le lecteur
  intégré de Chrome, pour les PDF scannés ou aux polices non extractibles
