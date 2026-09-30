# État de la recherche — gel au 29 août 2026

> **Ce document fige ce qui est établi.** Il est le point d'entrée des autres :
> quand une décision se prend, elle se prend sur ce qui est ici, pas sur un
> souvenir. Chaque ligne porte sa fiabilité et sa source.
>
> `[V]` vérifié en source primaire, copie dans `assets/` · `[T]` source tierce
> concordante · `[H]` hypothèse à nous, dérivation montrée · `[?]` inconnu nommé.
>
> **Règle du gel** : rien n'entre ici sans source. Une déduction n'est pas une
> vérification. Ce document a déjà servi à corriger deux de mes erreurs (§8).

---

## 1. La société — SARL, et trois choses à ne pas rater

**Décision LO, 29 août 2026 : SwimPay démarre en SARL, pas en SAS.** Documents en
cours d'émission en Côte d'Ivoire.

**Verdict : la SARL convient.** Mais trois points la conditionnent, et deux se
décident maintenant, pendant que les statuts s'écrivent.

### 1.1 La SARL est explicitement autorisée — mais jamais unipersonnelle

Instruction BCEAO **n° 001-01-2024 du 23 janvier 2024** relative aux services de
paiement dans l'UMOA, **article 13** `[V]`
(`assets/BCEAO-instruction-001-01-2024-services-paiement.pdf`) :

> « Les établissements de paiement sont constitués sous forme de **société
> anonyme, de société à responsabilité limitée ou de société coopérative**. **Ils
> ne peuvent revêtir la forme d'une société unipersonnelle.** La Banque Centrale
> apprécie l'adéquation de la forme juridique de l'établissement aux activités
> qu'il entend exercer. »

> ### ⚠ Une **SARLU** — SARL à associé unique — est disqualifiée d'office pour tout agrément de paiement futur.

C'est le point le plus urgent de tout ce document. Si les statuts en cours
d'émission prévoient un associé unique, **il faut au moins deux associés**, ou il
faudra transformer la société plus tard, avec un coût et un délai. La correction
est gratuite aujourd'hui.

### 1.2 Le siège doit être dans l'UMOA

Article 14 `[V]` : « Les établissements de paiement doivent avoir leur siège
social sur le territoire d'un État membre de l'UMOA. » Abidjan convient.

### 1.3 L'actionnariat sera examiné

Article 15 `[V]` : l'agrément est subordonné à l'honorabilité et à la capacité
financière des organes de gouvernance, des associés et des bénéficiaires
effectifs, ainsi qu'à **la transparence de la structure de propriété et à
l'origine licite des fonds** au regard de la LBC/FT.

Conséquence pratique : garder, dès la constitution, la traçabilité écrite des
apports. Ce n'est pas une formalité que l'on rattrape.

### 1.4 Sur le plan fiscal, la SARL ne change rien à ce qui est écrit

Les régimes d'imposition visent « les personnes physiques **ou morales** » `[V]`,
sans exclusion de forme. Une SARL se classe donc par son chiffre d'affaires,
comme le reste (`12_ASSUJETTISSEMENT_TVA_ET_FNE.md` §1).

SwimPay, à l'hypothèse V2 (~86 M FCFA de CA annuel), serait au **régime des
microentreprises** — donc **sans droit de facturer la TVA** à ses propres clients.
Conclusion inchangée : rester au RME tant que la clientèle est majoritairement
micro (`12` §8.5). *À faire confirmer par le comptable — c'est une question de
trente secondes pour lui.*

---

## 2. Le socle réglementaire — trois portes, trois prix

Instruction BCEAO 001-01-2024, **article 4** : huit services de paiement.

| | Service |
|---|---|
| i | versement, retrait d'espèces, gestion de compte |
| ii | virements, prélèvements, paiements par carte |
| iii | transfert de fonds |
| iv | paiement par tout moyen de communication |
| v | émission d'instruments de paiement |
| vi | acquisition d'opérations de paiement |
| **vii** | **initiation de paiement** |
| **viii** | **agrégation de comptes / information sur les comptes** |

**Article 11 — capital social minimum**, intégralement souscrit et libéré en
numéraire à la date de l'agrément `[V]` :

| Ce que l'établissement fournit | Capital minimum |
|---|---|
| **viii seul** (agrégation) — simple **enregistrement**, pas agrément (art. 9) | **10 M FCFA** |
| **vii seul** (initiation) | **20 M FCFA** |
| **vii + viii** | **30 M FCFA** |
| **au moins un de i) à vi)** | **100 M FCFA** |

La décision d'agrément peut fixer un montant supérieur.

### 2.1 Ce que ça change par rapport à nos notes

`00_VISION.md` retenait « agrément EME, 300 M FCFA » comme le seuil, et en
concluait au modèle sponsor. **C'est toujours vrai pour l'émission de monnaie
électronique, mais ce n'est plus la seule porte.**

La couche que SwimPay construit — instruire des paiements chez un partenaire et
lire les comptes pour rapprocher — correspond aux services **vii et viii**, soit
**30 M FCFA**, pas 100 ni 300. `[H]` sur le rattachement exact, `[V]` sur les
montants.

**La nuance qui décide** : dès que SwimPay *encaisse pour le compte de ses
marchands* (le QR, le checkout), on tombe dans **vi — acquisition d'opérations de
paiement**, donc **100 M**. Tant que c'est le partenaire licencié qui encaisse et
que SwimPay est l'interface, on reste hors de cette case.

### 2.2 Et pour la V1, la vraie case est l'article 38

**Article 38 — Agents de services de paiement** `[V]` :

> « Nul ne peut exercer l'activité d'**agent de services de paiement** sans avoir
> été préalablement **immatriculé par la Banque Centrale**. L'immatriculation est
> matérialisée par une inscription dans le registre qu'elle tient à cet effet.
> Lorsqu'un établissement de paiement envisage de fournir des services de paiement
> par l'intermédiaire d'un agent de services de paiement, il transmet à la Banque
> Centrale [le nom et l'adresse de l'agent, son identification, …]. »

> **Le modèle sponsor de la V1 a un nom réglementaire et une formalité :
> l'immatriculation d'agent, déposée par le partenaire licencié.**

Pas de plancher de capital, pas d'agrément propre — mais **ce n'est pas
informel**. À mettre au contrat avec PayDunya ou Julaya : *qui dépose, quand, et
que se passe-t-il si la Banque Centrale refuse.* C'est une question à poser au
commercial en même temps que les tarifs.

---

## 3. Le socle fiscal — ce qui est tranché

| Point | État | Où |
|---|---|---|
| Quatre régimes, frontière TVA à **200 000 001 F** de CA annuel TTC | `[V]` | `12` §1 |
| Un non-assujetti **ne facture jamais la TVA** | `[V]` | `12` §1 |
| Code FNE du non-assujetti = **`TVAD`**, nommé « D (TEE, TCE, Microentreprise) » par la plateforme | `[V]` | `12` §3 |
| La FNE est obligatoire **quel que soit le régime**, depuis le 1ᵉʳ déc. 2025 | `[V]` | `12` §3 |
| **Un logiciel ne peut émettre qu'une FNE** — le RNE n'a ni API ni chemin logiciel (TPE ou appli mobile seulement) | `[V]` | `08` §8.1 |
| `isRne` = « la facture est reliée à un reçu **déjà émis** », pas un mode d'émission | `[V]` | `08` §8.1 |
| Franchise de sticker **sous 5 000 F : toujours en vigueur** | `[T]` | `08` §9.9 |
| La FNE porte le régime **des deux parties**, résolu depuis le NCC | `[V]` | `08` §8.3 |
| La plateforme **avertit** si le client est en cessation d'activité | `[V]` | `08` §8.4 |
| La remise s'applique **avant** la TVA | `[V]` | `08` §8.6 |
| Deux états : sauvegardée (sans QR) / générée (certifiée) | `[V]` | `08` §8.5 |
| Sticker : 20 F (FNE), 15 F (RNE), **gratuit ≤ 5 000 F** | `[V]` | `08` §6 |
| Douze catégories dispensées de FNE, parfois partiellement | `[V]` | `12` §2 |
| **4 intégrateurs agréés** dans le pays, tous revendeurs de comptabilité, liste figée depuis 9 mois | `[V]` | `11` §1.4 |
| Consultation NCC officielle : existe, **protégée par reCAPTCHA** | `[V]` | `12` §4 |
| Elle renvoie **le statut d'assujettissement à la TVA**, l'activité, l'état et la dernière déclaration | `[V]` | `12` §4.1 bis |
| La plateforme tient aussi les **factures reçues** et notifie à chaque réception | `[V]` | `08` §9.6 |
| Identifiant de connexion à la plateforme = **le NCC** | `[V]` | `08` §9.2 |
| Une entreprise porte **un IDU et un NCC** | `[V]` | `08` §9.3 |
| Environnement de test DGI : **en ligne** (HTTP 200) | `[V]` | `08` §8.7 |
| Inscription (test comme prod) : exige **NCC + NTD** | `[V]` | `08` §8.7 |

---

## 4. Le terrain concurrentiel — ce qui est tranché

| Point | État |
|---|---|
| Julaya : > 1 000 entreprises, 10 000 professionnels, 700 000 paiements/an, 4 pays, EP.CI.004/2025 | `[V]` |
| Julaya : **zéro FNE, zéro DGI, zéro crédit** sur tout son site | `[V]` |
| Orange Ventures et CDC-CI (État) au capital de Julaya | `[V]` |
| Julaya 2,8× moins cher que PayDunya sur la paie du prototype | `[V]` |
| PayDunya CI : PayIn 2,25 %, PayOut 2,00 % → swap 4,25 % | `[V]` |
| 52 000 entreprises inscrites à la FNE, ~70 % actives | `[T]` |
| L'État tient déjà **RNPP/NNI** (personnes) et **FNE/NCC** (ventes), sans lien entre les deux | `[T]` |
| Le volume de Julaya (« 1 000 Md ») : période **ambiguë**, ne pas citer tel quel | `[V]` du texte, `[?]` du sens |

---

## 5. Ce qui est construit — mesuré dans le repo

| | |
|---|---|
| Modules du cerveau | 4 + adaptateurs de rails |
| Code hors tests | 2 485 lignes |
| Cas de test | 98, pour 169 assertions |
| Tables | 40, sur 4 migrations |
| Invariants prouvés sur Postgres 16 | 60 |
| Migrations rejouées deux fois sans erreur | oui |
| Rails branchés | **aucun** |
| Clients | **aucun** |

---

## 6. Ce qui manque, nommément

**Bloquants immédiats :**

1. **NCC + NTD** d'une entité réelle, pour s'inscrire sur l'environnement de test
   DGI et éprouver l'algorithme. Rien ne démarre sans ça.
2. **Le nombre d'associés de la SARL** — au moins deux (§1.1).

**À trancher :**

3. Partenaire de lancement : PayDunya (cher, neutre) ou Julaya (2,8× moins cher,
   concurrent direct). Non tranché.
4. ~~FNE ou RNE pour la V1 ?~~ **Tranché le 29 août au soir** : **FNE
   exclusivement**. Le RNE n'a aucun chemin logiciel — ses deux seuls outils sont
   un TPE et une application mobile (`08` §8.1). Aucune dépendance matérielle
   pour nous.
5. Le « direct » entre deux comptes SwimPay : V1 ou phase 2 ? Le site le promet
   déjà.

**Inconnus nommés :**

6. `[?]` Le champ `warning` de la réponse API est-il l'avertissement de cessation
   d'activité, et arrive-t-il **avant** consommation du sticker ?
7. ~~`[?]` NCC ou IDU ?~~ **Résolu le 29 août au soir** : une entreprise porte
   **les deux**. Observé sur un compte réel — IDU `CI-2025-0027163 N` et NCC
   `2500736C`. C'est le **NCC** qui sert d'identifiant de connexion et de champ
   de facture (`08` §9.3).
8. `[?]` Le tarif de `direct-pay/credit-account` chez PayDunya, et le coût de
   l'alimentation par virement bancaire.
9. `[?]` Les seuils de volume qui font passer Julaya de 1,5 % à 0,5 %.
10. `[?]` Le délai réel du comité d'agrément FNE — la liste n'a pas bougé depuis
    neuf mois, et on ignore si c'est faute de demandes ou faute de séances.

---

## 7. Les questions pour le comptable, aujourd'hui

Courtes, et chacune débloque quelque chose :

1. **Peux-tu nous fournir un NCC et un NTD** pour ouvrir un compte sur
   l'environnement de **test** de la FNE ? (Données fictives uniquement ensuite.)
2. ~~NCC ou IDU ?~~ **Répondu par la vidéo** : les deux existent, le NCC est
   l'identifiant utilisé. Reste à confirmer qu'une société **créée en 2026**
   reçoit encore un NCC et pas seulement un IDU.
3. Une **SARL** peut-elle relever du régime des microentreprises et de la taxe
   d'État de l'entreprenant, ou les sociétés sont-elles d'office au réel ?
4. Pour un client au forfait, tu émets une **FNE** ou un **RNE** ?
5. Quand tu factures un client non assujetti, tu choisis bien
   **« TVA exo.lég — D »** dans la liste ?
6. Le message « entreprise en cessation d'activité » — l'as-tu déjà vu, et
   **consomme-t-il un sticker** quand on continue ?

---

## 8. Deux corrections déjà passées par ce gel

Ce document existe parce que je me suis trompé deux fois en une journée, et que
les deux fois la vérification a coûté moins cher que l'erreur.

1. **« Aucun code FNE ne dit non assujetti, c'est bloquant. »** Faux. Déduit du
   schéma de l'API sans vérifier la pratique — et la réponse était dans un guide
   de 45 pages **déjà téléchargé dans le repo, non ouvert**. Le code est `TVAD`.
2. **« Le volume de Julaya est de 1 000 Md par an. »** La source dit « flux
   annuels **déjà** traités », ce qui se contredit ; l'arithmétique avec leurs
   700 000 paiements donne 1,43 M par opération, ce qui est haut pour de la paie.
   Ordre de grandeur seulement.

**Règle qui en découle, et qui s'applique à la suite :** lire ce qu'on a avant de
conclure sur ce qu'on n'a pas ; et quand une déduction contredit un praticien,
c'est la déduction qui est suspecte.

---

## 9. Sources gelées

Toutes copiées dans `assets/`, relevées le 29 août 2026 sauf mention.

**Réglementation**
- BCEAO, **Instruction n° 001-01-2024** du 23 janvier 2024, services de paiement
  dans l'UMOA, 44 p. — articles 4, 9, 10, 11, 13, 14, 15, 38
- ARTCI, **loi n° 2013-450** du 19 juin 2013, protection des données `[T]`

**Fiscalité**
- DGI, **Le système fiscal ivoirien**, 70 p. — pages 3, 7, 9, 11 rendues en images
- DGI, **guide d'utilisation de la plateforme FNE**, 45 p. — pages 5, 6, 31, 33,
  42 rendues en images
- DGI, **procédure d'interfaçage par API**, mai 2025, 26 p.
- DGI, **liste des entreprises agréées FNE**, n° 0008 du 28 novembre 2025
- DGI, présentation, historique, imprimeurs agréés
- DGI, **note explicative sur les plateformes numériques**, art. 7 annexe fiscale 2022
- `fne.dgi.gouv.ci/entreprises.php` — opérations dispensées
- `e-impots.gouv.ci/index/verifier-ncc` — sondé, version 3.7.2 du 06/03/2026

**Concurrence**
- `julaya.co/fr` et `julaya.co/fr/prices` — captures conservées
- `paydunya.com/service-fees` — capture conservée
- Agence Ecofin (21 oct. 2025), KOACI (17 oct. 2025) `[T]`

**Outils de relevé**, sans dépendance installée, dans `design/pivot/sondes/` :
`lire-pdf2.mjs` (texte d'un PDF par zlib, seuil de crénage calibré),
`pages-pdf.mjs` (rendu de pages précises via Chrome).
