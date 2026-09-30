# L'algorithme V1 — figé le 29 août 2026

> **Ce document fige ce que la V1 fait, ce qu'elle refuse de faire, et ce dont
> elle ne dépend pas.** Il se lit après `13_ETAT_DE_LA_RECHERCHE.md`, qui porte
> les faits, et il en tire les conséquences.
>
> Un algorithme figé n'est pas un algorithme complet. C'est un algorithme dont
> les **règles ne bougent plus** : on peut coder par-dessus sans craindre qu'une
> décision de fond soit reprise la semaine suivante.

---

## 1. Le déplacement de position

### 1.1 Ce qu'on disait hier

> « SwimPay encaisse sur tous les réseaux, facture automatiquement, rapproche
> chaque paiement de chaque vente. »

C'est juste, et ça reste la destination. Mais **la V1 ainsi formulée ne peut pas
démarrer** : encaisser suppose un partenaire de rail, qui suppose un contrat, qui
suppose une immatriculation d'agent auprès de la BCEAO — et le partenaire le moins
cher est un concurrent direct. Tout le produit attendait une signature.

### 1.2 Ce que les trouvailles d'aujourd'hui changent

Sept faits, tous établis dans `13`, pointent dans la même direction :

1. **La FNE est la seule pièce qu'un logiciel peut produire** ; le RNE demande un
   terminal. Notre voie est logicielle de bout en bout.
2. **La franchise sous 5 000 F existe toujours.** Sur des micro-marchands, une
   large part des certifications ne coûte rien.
3. **La plateforme tient les factures REÇUES** et notifie à chaque réception.
4. **Ces notifications ne sont pas lues** — 219 jours d'arriéré chez un cabinet
   comptable en exercice.
5. **La consultation d'un NCC rend le statut TVA, l'activité et l'état** de
   n'importe quelle entreprise.
6. **Le régime du marchand est affiché dans son propre espace FNE.**
7. **Les quatre intégrateurs agréés sont des revendeurs de logiciels
   comptables.** Aucun ne voit un encaissement.

Mis bout à bout, ils disent une chose que je n'avais pas vue :

> **Toute la boucle fiscale est atteignable sans déplacer un seul franc.**

### 1.3 La position, déplacée

| | Avant | **Maintenant** |
|---|---|---|
| Ce qu'on vend d'abord | l'encaissement, avec la facture en prime | **la mémoire fiscale**, avec l'encaissement ensuite |
| Ce qu'il faut pour démarrer | un partenaire de rail signé | **une clé API de la DGI** |
| Le côté regardé | ce que le marchand **vend** | ce qu'il **vend et ce qu'il achète** |
| Le concurrent frontal | Julaya, Djamo, PayDunya | **personne** — les 4 agréés ne voient pas l'argent |
| Le rail | au cœur | **une extension**, ajoutée quand elle est prête |

Ce n'est pas un renoncement au paiement. C'est un **changement d'ordre** : la
mémoire d'abord, le mouvement ensuite. Et l'ordre inverse était bloqué.

### 1.4 Le « + » de la V1, dit sans emphase

> **La V1 est utile le jour de son installation, sans rail, sans licence, sans
> partenaire, sans contrat de distribution.**

Un marchand qui l'installe obtient, dès le premier jour :

- ses factures légales émises et certifiées, sans ressaisie ;
- **ce que ses fournisseurs lui ont facturé**, rassemblé et lisible — ce que
  personne ne lui montre aujourd'hui ;
- le rapprochement des deux avec ses mouvements bancaires et mobile money,
  importés ;
- son stock de stickers suivi, avec l'alerte avant la rupture ;
- et, mois après mois, **un historique certifié par l'État** qui devient son
  premier dossier bancable.

Et pour nous, trois effets qui comptent plus que le confort :

1. **La dépendance la plus dangereuse sort du chemin critique.** On n'a plus
   besoin de choisir entre payer cher (PayDunya) et se montrer à un concurrent
   (Julaya) *avant* d'avoir un produit.
2. **On arrive chez le partenaire avec des clients et du volume**, pas avec une
   présentation. Ça change la grille qu'on obtient.
3. **On accumule l'actif qui compose** — les mois d'historique certifié — pendant
   que les autres attendent.

---

## 2. L'algorithme, figé

### 2.1 Les deux boucles

La V1 fait tourner **deux boucles symétriques**, et rien d'autre.

**Boucle A — ce que le marchand vend**

```
1. VENTE ENREGISTRÉE      caisse · import · API marchand
2. PIÈCE PRÉPARÉE         totaux : brut, remise, net, TVA ligne par ligne
3. CONTRÔLE A PRIORI      refuser AVANT de brûler un sticker
4. CERTIFICATION          un seul vol en l'air à la fois, ticket ouvert avant
5. CLASSEMENT             accepté · refusé · incertain · bloqué  (par slug)
6. RAPPROCHEMENT          la pièce ↔ le mouvement d'argent
7. RECOMPTAGE             quotidien, sur ce qui est écrit, pas sur un souvenir
```

**Boucle B — ce que le marchand achète** *(la nouveauté)*

```
1'. FACTURE REÇUE         notifiée par la plateforme FNE
2'. APPARIEMENT           la pièce reçue ↔ le décaissement
3'. ALIMENTATION          TVA déductible si assujetti, sinon coût
4'. RECOMPTAGE            même règle, même exigence
```

Les deux boucles partagent le même moteur de rapprochement et le même registre.
La boucle B est ce que personne ne fait, et elle ne coûte presque rien à ajouter
puisque la moitié du travail est déjà faite pour la boucle A.

### 2.2 Les dix invariants

Ce sont eux qu'on fige. Chacun est déjà prouvé par un test ou une contrainte de
base, ou nommé comme à construire.

| # | Invariant | État |
|---|---|---|
| **I1** | Aucune pièce ne part sans **ticket ouvert et commité** avant l'appel réseau | contrat écrit (`dgi-adapter.ts`) |
| **I2** | **Aucun rejeu aveugle.** `retryable` est faux dans tous les cas, sans exception | **prouvé** (`dgi-errors.test.ts`) |
| **I3** | Une **issue inconnue ne se ferme que par un humain** — jamais par un délai, jamais par une heuristique | migration 040 |
| **I4** | Le **numéro officiel est figé** dès réception et ne se recalcule jamais | migration 040 |
| **I5** | Une pièce certifiée **ne se modifie pas** : elle se corrige par un avoir, qui est lui-même une pièce | migration 040 |
| **I6** | La **TVA porte sur le HT après remise**, arrondie **ligne par ligne** | **prouvé** (cas officiel) |
| **I7** | Un **non-assujetti ne porte jamais autre chose que `TVAD`** ; au-delà du seuil, le moteur refuse et passe la main | **prouvé** (`invoicer.test.ts`) |
| **I8** | Le classement d'erreur se fait **par slug**, jamais par code HTTP ; un 404 ambigu ne va **jamais** en file métier | **prouvé** (`dgi-errors.test.ts`) |
| **I9** | Le **solde de stickers est lu à chaque réponse**, et alerte avant rupture | à coder |
| **I10** | **Rien ne se supprime.** Tout est append-only, y compris les erreurs et les accès | migrations 037-040 |

### 2.3 Les trois refus

Un algorithme se définit autant par ce qu'il refuse. La V1 refuse :

1. **De deviner une issue.** Après un timeout ou un 500, l'état est *inconnu*, il
   s'écrit *inconnu*, et il attend un humain. La DGI n'a ni idempotence ni
   endpoint de lecture : rejouer, c'est risquer un doublon officiel, qui ne se
   supprime pas.
2. **De corriger en silence.** Une TVA posée sur une facture de non-assujetti
   n'est pas une valeur à rectifier : c'est un refus d'émettre. Une correction
   silencieuse se découvre au contrôle fiscal, un blocage se voit tout de suite.
3. **De mélanger nos bugs et ceux du marchand.** Une URL fausse chez nous
   réveille un développeur ; une donnée fausse chez le marchand va en file
   d'exception. Le même code HTTP, deux destinations opposées.

### 2.4 Ce qui n'est PAS dans la V1

Écrit ici pour qu'on n'y revienne pas : **encaissement, versement, swap, paie,
détention de solde, checkout.** Tout ce qui déplace de l'argent est une extension
de la V2, et chacune arrive avec son rail.

La V1 **lit** des mouvements d'argent (relevés importés) pour rapprocher. Elle
n'en **provoque** aucun.

---

## 3. Ce dont la V1 ne dépend pas

C'est la liste qui porte l'argument. Aucun de ces éléments n'est sur le chemin
critique de la V1 :

- un partenaire de rail signé — **ni PayDunya, ni Julaya, ni CinetPay** ;
- l'agrément d'établissement de paiement BCEAO ;
- l'immatriculation d'agent de services de paiement (article 38) ;
- un capital social de 30 ou 100 millions ;
- un terminal TERNE, ni le seul fournisseur agréé du pays ;
- l'agrément éditeur/intégrateur DGI — **utile, mais pas bloquant** : la voie
  « une clé par marchand » fonctionne pour les pilotes.

**Une seule dépendance reste :** une clé API FNE. Pour l'obtenir en test, une
entreprise inscrite au registre de l'environnement de test. Le courriel est parti.

---

## 4. Ce qui est déjà construit

| Brique | État |
|---|---|
| Totaux, arrondis, brut/remise/net, quatre taux | **fait**, cas officiel reproduit au franc |
| Numérotation locale, contrôle a priori | fait |
| Classement des erreurs par slug + politique | **fait**, 12 tests |
| Contrat de l'adaptateur DGI, machine à états, tickets | fait (types) |
| Rapprocheur — décision pure | fait |
| Annuaire d'identité | fait |
| Routeur | fait, dormant en V1 |
| Schéma : 40 tables, 60 invariants sur Postgres réel | fait |
| **Transport HTTP réel vers la DGI** | **à coder** — bloqué sur la clé |
| **Lecture des factures reçues (boucle B)** | **à coder**, et `[?]` sur l'API |
| **Suivi du solde de stickers + alerte** | à coder |
| Import de relevés (banque, mobile money) | à coder |

**117 tests au vert, typecheck propre**, au moment du gel.

---

## 5. Ce qui reste ouvert, nommément

1. `[?]` **La boucle B a-t-elle une API ?** L'écran « Reçus et factures
   réceptionnés » existe, donc un endpoint existe — mais il n'est pas documenté.
   *Si la réponse est non, la boucle B se fait par import manuel ou par lecture
   d'écran, et son « + » se réduit sans disparaître.* C'est la seule inconnue qui
   touche le cœur de la position déplacée, et elle doit partir à la DGI.
2. `[?]` Le champ `warning` de la réponse est-il l'avertissement de cessation
   d'activité, et arrive-t-il avant ou après consommation du sticker ?
3. `[?]` Un accès machine à la consultation NCC pour un éditeur agréé ?
4. `[?]` Une société créée en 2026 reçoit-elle encore un NCC, ou seulement l'IDU ?
5. À trancher par LO : le partenaire de rail — **mais plus tard**, et c'est tout
   l'intérêt du déplacement.

---

## 6. Ce que ce gel autorise dès demain

Sans attendre quoi que ce soit :

1. **Le transport HTTP** vers la DGI, écrit et testé contre un double qui rejoue
   les réponses mesurées (`dgi-errors.test.ts` en donne déjà les charges utiles).
2. **Le suivi des stickers** et l'alerte, à partir de `balance_sticker`.
3. **L'import de relevés** et le rapprochement, qui ne dépendent d'aucune API.
4. **La file d'exception** et son écran, qui est là où atterrit tout ce que
   l'algorithme refuse de deviner.

Le jour où la clé arrive, il ne reste qu'à brancher — et à éprouver les cas que
`08` §10.5 liste, en bac à sable.
