# Tarifs des réseaux et coûts réels, par opération

> Recherche demandée par LO le 30 août 2026, après un reproche fondé : la grille
> de `19_MODELE_DE_REVENUS.md` posait des prix sans les avoir cherchés. Ce
> document apporte les chiffres publics, source par source, et calcule **ce que
> chaque opération nous coûte vraiment** selon le chemin utilisé.
>
> `[V]` vérifié en source primaire, `[T]` source tierce concordante, `[H]` calcul
> à nous. Relevé le 30 août 2026.

---

## 1. Ce que coûtent les réseaux mobile money

### 1.1 La grille, réseau par réseau

| Réseau | Envoi même réseau | Retrait (cash-out) | Encaissement marchand par API (**notre coût**) |
|---|---|---|---|
| **Orange Money** | **0 F** `[V]` | **1 %** `[V]` | **1 %**, règlement à J+5 `[T]` ; jusqu'à 1,5–2,2 % selon volume `[T]` |
| **Wave** | **1 %** `[T]` | **0 %** (2026) `[T]` | **~1 %** par API `[T]` ; QR gratuit pour le client |
| **MTN MoMo** | gratuit vers un abonné MTN, sinon **1 % (plafond 4 500 F)** `[T]` | **1 % (plafond 4 500 F)**, promo 0 % via l'appli `[T]` | paiement marchand gratuit pour le client `[T]` ; coût API à confirmer |
| **Moov Money** | gratuit vers un abonné Moov, sinon **1 %** `[T]` | **1 %** `[T]` | paiement direct souvent gratuit ou réduit `[T]` |

Sources : `orange.ci/fr/tarifs-orange-money.html` `[V]` ; blogs tarifaires CI 2026
et pages opérateurs `[T]`.

### 1.2 Le fait de marché qui explique tout

**Depuis l'arrivée de Wave (2021), tout le marché s'est aligné sur ~1 %.** Avant,
les opérateurs prenaient 1,5 à 3 %. Wave a imposé le retrait à 1 % puis 0 %, et
l'envoi à 1 %. Conséquences pour nous :

- **L'envoi dans le même réseau est déjà gratuit ou à 1 %.** On ne peut rien
  gagner là.
- **Le retrait est à 1 % ou déjà gratuit** (Wave, promo MTN). On ne peut pas le
  facturer plus cher que zéro.
- **Le paiement marchand est gratuit pour le client**, et coûte **~1 %** au
  marchand qui encaisse par API. C'est notre coût de référence pour encaisser.

### 1.3 La correction de mon erreur

`19` disait « Orange → Orange gratuit » sans source. **C'est vrai** (orange.ci :
« frais d'envoi 0 FCFA »), mais je l'avais deviné. C'est désormais sourcé. Le
reste des pourcentages de `19` était des propositions `[P]` que ce document
confronte enfin aux chiffres réels.

---

## 2. Ce que coûtent les rails (payin / payout)

| Rail | Encaisser (payin) | Verser (payout) | Fiabilité |
|---|---|---|---|
| **PayDunya** | **2,25 %** | **2,00 %** | `[V]` primaire (`09`) |
| **Julaya** | **0,5 à 1 %** | **0,5 à 1,5 %** | `[V]` primaire (`10`) |
| **CinetPay** | **1,5 à 3,5 %** (paliers 3,5 · 2,5 · 2) | **1,5 %** | `[V]` Chrome réel, page affichée pour le Mali (zone UEMOA), à confirmer identique en CI |
| **Hub2** | **sur devis, non public** (~1,8–2,5 % `[T]`) | sur devis | `[T]` |

Note primaire : la grille CinetPay est relevée au Chrome réel
(`assets/cinetpay-pricing-2026-08-30.png`). Le payin va de **1,5 % (gros
volume) à 3,5 % (petit volume)**, le payout groupé est **fixe à 1,5 %**.

---

## 3. Ce que ça nous coûte, par élément

Le point que LO réclamait : pour chaque opération, le coût selon le chemin.

### 3.1 Encaisser un paiement (le commerçant reçoit)

| Chemin | Notre coût |
|---|---|
| **API marchande Wave** | **~1 %** `[T]` |
| **API marchande Orange** | **1 %**, règlement **J+5**, jusqu'à 1,5–2,2 % selon volume `[T]` |
| **API marchande MTN** | **1,5 à 2 %** en direct, 2,5 % via agrégateur `[T]` |
| Rail PayDunya | 2,25 % `[V]` |
| Rail Julaya | 0,5 à 1 % `[V]` |
| Rail CinetPay | 1,5 à 3,5 % `[V]` |
| **Netting** (nos caisses) | **~0,1 %** en simulation `[T]` |

> **Découverte : encaisser chez l'opérateur qui a le prix Wave (~1 %) coûte deux
> fois moins qu'un rail généraliste (PayDunya 2,25 %, CinetPay jusqu'à 3,5 %).**
> Mais tous les opérateurs ne se valent pas : Wave ~1 %, Orange ~1 % (mais J+5),
> **MTN 1,5 à 2 %**. Le rail le moins cher reste Julaya (0,5 à 1 %). Et le netting
> bat tout le monde.

### 3.2 Verser (paie, fournisseur, sortie)

| Chemin | Notre coût |
|---|---|
| Julaya payout | 0,5 à 1,5 % `[V]` |
| PayDunya payout | 2,00 % `[V]` |
| API de décaissement de l'opérateur | à confirmer, ~1 % `[H]` |
| **Netting** | **~0,1 %** `[T]` |

### 3.3 Retirer (SwimPay → un réseau)

C'est un versement vers un réseau, donc le coût du §3.2. **Ensuite**, le client
retire chez l'opérateur et paie **son** cash-out : Orange 1 %, Wave 0 %,
MTN/Moov 1 %. Si on lui facturait aussi la sortie, il paierait deux fois.
D'où la recommandation de `19` : **sortie gratuite ou symbolique**.

---

## 4. Le swap, la question de LO, chiffrée

> *« Le swap, combien on devrait facturer sur la base des chiffres des
> concurrents si on utilisait une API de rails ? »*

Un swap Orange → Wave, c'est **encaisser sur Orange + verser sur Wave**. Le coût
dépend entièrement du chemin.

| Chemin du swap | Calcul | **Ce que ça nous coûte** |
|---|---|---|
| Rail **PayDunya** | 2,25 % + 2,00 % | **4,25 %** `[V]` |
| Rail **CinetPay** | (1,5–3,5 %) + 1,5 % | **3 à 5 %** `[V]` |
| Rail **Hub2** | ~2 % + ~2 % | **~4 %** `[T]` |
| Rail **Julaya** | 0,5–1 % + 0,5–1,5 % | **1 à 2,5 %** `[V]` |
| **Netting** (nos caisses) | résidu | **~0,1 %** `[T]` |

### 4.1 La réponse, sans détour

**Si on passe par une API de rails, un swap nous coûte entre 2,5 % et 4,25 %.**

Pour ne pas perdre d'argent, il faudrait donc facturer le client **au moins 2,5 %,
et jusqu'à plus de 4 %** selon le rail. Or :

- le transfert entre réseaux chez les opérateurs eux-mêmes tourne autour de **1 %**
  (Wave, MTN) ;
- le **PI-SPI le rendra gratuit** à terme `[T]`.

> **Conclusion : facturer un swap plus de 2,5 % est intenable face à un marché à
> 1 % qui va vers le gratuit. Donc le swap par une API de rails perd de l'argent
> à tout prix acceptable.**

### 4.2 Ce que ça prouve

**Le swap n'est rentable que quand les deux bouts sont chez nous** (on-us, coût
~0,1 %). Vers un numéro extérieur, il paie le frais de sortie de l'opérateur
(~1 %) et ne rapporte rien au prix de 1 %. Voir le détail des régimes au §5.

Autrement dit : le rail généraliste est un **filet de secours coûteux**, pas le
chemin normal. Mon `18` l'avait dit pour la fiabilité ; les chiffres le
confirment pour le prix. **Sans netting, il n'y a pas de marge sur le swap, ni
sur rien qui traverse.**

### 4.3 Le prix à afficher

| | Valeur |
|---|---|
| Prix marché du transfert inter-réseau | **~1 %** (Wave, MTN) |
| Notre coût par netting | ~0,1 % |
| **Prix SwimPay proposé** | **1 %, plafonné 500 F** `[P]` |
| Marge (par netting) | ~0,9 point |
| Marge (par rail, secours) | **négative**, à éviter |
| Alerte PI-SPI | la marge disparaît quand le rail public devient gratuit |

---

## 5. Quand le netting joue, et ce qu'on gagne vraiment

> **Correction assumée.** La première version collait « netting ~0,1 % » sur
> chaque opération, comme si c'était magique. **C'est faux, et LO l'a vu.** Le
> netting ne s'applique pas partout de la même manière. Voici le vrai modèle.

### 5.0 Les trois régimes de coût

Toute opération tombe dans l'un des trois. C'est ça qu'il fallait poser d'abord.

1. **Interne (on-us) — ~0,1 %.** Les deux bouts sont des clients SwimPay.
   L'argent ne quitte jamais nos livres, c'est une écriture. Un utilisateur paie
   un autre, un salaire versé à un employé déjà client, un achat payé depuis un
   solde SwimPay. **C'est là qu'on gagne.**
2. **De bord — ~1 %.** L'argent **entre** depuis un mobile money (un client
   extérieur paie) ou **sort** vers un numéro extérieur. On paie le frais de
   l'opérateur, **que le netting ne supprime pas**. Encaisser d'un inconnu, un
   retrait vers Orange, une paie vers un employé non client.
3. **Rail (secours) — 2 à 5 %.** Caisse à sec, on passe par PayDunya, CinetPay,
   Hub2.

### 5.0 bis Ce que le netting fait, et ce qu'il ne fait pas

**Ce qu'il fait :** il évite de déplacer l'argent **entre nos caisses**. On
encaisse sur Wave, on paie sur Orange ; un système naïf bougerait Wave→Orange à
chaque fois, en payant un rail. Le netting apparie les deux sur la masse, on ne
bouge que le déséquilibre. **Il économise le rééquilibrage.**

**Ce qu'il ne fait pas :** il ne supprime **pas** le frais de bord (~1 %) quand
l'argent touche le monde extérieur. Pour un **checkout**, si l'acheteur n'est pas
client, son argent entre depuis son Orange et **coûte ~1 %** d'entrée, netting ou
pas. Le netting ne le rend gratuit que si l'acheteur paie **depuis son solde
SwimPay**.

> **La vraie marge des transactions vient du on-us, pas du netting seul.** Le
> netting empêche les flux de bord de nous saigner ; le on-us fait le bénéfice.
> C'est pour ça qu'on recrute des chaînes : plus l'argent reste dedans, plus il
> devient rentable.

### 5.0 ter La formule, et le QR adaptatif (idée de LO)

Toute la marge tient en une ligne :

```
marge = prix facturé (marché + prime FNE) − coût routé au plus bas
```

Les deux bords sont des leviers qu'on pilote. Le prix suit la tendance du marché
et la valeur d'émettre la FNE. Le coût, on le tire vers le bas en **choisissant
le chemin** à chaque opération.

**Le QR adaptatif** rend ce choix concret à l'encaissement. Le QR se *morphe*
selon le portefeuille de l'acheteur : il paie en Orange, on capture dans notre
caisse Orange ; il paie en Wave, dans la caisse Wave. On capture toujours sur le
**même réseau que l'acheteur**, donc on ne paie jamais une conversion inter-réseau
à l'entrée. Le déséquilibre entre caisses qui en résulte est réglé plus tard, sur
le net, par le netting. C'est l'organisation des caisses que LO décrit, appliquée
à chaque paiement.

**Ce qui décide de la TAILLE de l'écart, à obtenir par devis avant de figer :**

1. Le vrai coût de **capture par opérateur** (paiement marchand ~1 % chez Wave et
   Orange, 1,5–2 % chez MTN ; le P2P à 0 F n'est pas utilisable pour de
   l'encaissement commercial, ni traçable, ni conforme).
2. Les **taux négociés** des rails (Julaya, CinetPay) et des API opérateurs.
3. Le **coût de décaissement** (payout) par opérateur.

Ces trois nombres font passer l'écart de 0,3 à 1,5 point. Pas de son existence.

### 5.1 à 5.4 La marge, selon que le bout est dedans ou dehors

Prix `[P]`. Pour chaque opération : le cas courant (un bout dehors) et le cas
fermé (tout chez nous).

| Opération | Prix | Cas courant, un bout dehors | Cas fermé, tout SwimPay |
|---|---|---|---|
| **Encaisser une vente** | 1 % | coût ~1 % → **marge ~0** | coût ~0,1 % → **+0,9 %** |
| **Swap Orange→Wave** | 1 % | coût ~1 % (sortie) → **~0** | coût ~0,1 % → **+0,9 %** |
| **Paie de salaire** | 1 % | coût ~1 % → **~0** | employés clients → **+0,9 %** |
| **Checkout** | 1,5 % | coût ~1 % → **+0,5 %** | acheteur client → **+1,4 %** |
| **Retrait vers un réseau** | gratuit | coût ~1 % (sortie) → **perte** si facturé | — |

Le checkout est le seul qui gagne **toujours** un peu, parce que son prix (1,5 %)
dépasse le frais de bord (~1 %). Tous les autres ne rapportent qu'en **fermé**.

Et **par un rail** (secours, caisse à sec) : encaissement et swap passent en
**perte** (2 à 5 %). On ne les y met qu'en dernier recours.

### 5.5 Le vrai mois de PME, corrigé

5 M encaissés (clients extérieurs) + 3 M de paie.

| Poste | Prix | Marge si employés clients | Marge si employés dehors |
|---|---|---|---|
| Abonnement | 10 000 F | **10 000 F** | 10 000 F |
| Encaissement 5 M (bord) | 1 % | ~0 | ~0 |
| Paie 3 M | 1 % | **+27 000 F** (on-us) | ~0 (bord) |
| **Total mensuel** | | **≈ 37 000 F** | **≈ 10 000 F** |

> **Correction : mon 82 000 F supposait du netting sur l'encaissement extérieur,
> ce qui n'existe pas.** Le vrai chiffre est ~37 000 F quand les employés sont
> clients, et tombe à ~10 000 F (l'abonnement seul) quand tout le monde est
> dehors. **La marge monte à mesure que les employés, les fournisseurs et les
> clients rejoignent SwimPay.** Le netting, lui, garde les flux de bord à
> l'équilibre au lieu de les laisser nous coûter un rail.

### 5.6 La règle, corrigée

1. **L'abonnement est la marge sûre.** Il ne dépend d'aucun chemin.
2. **La marge des transactions vient du on-us**, quand les deux bouts sont chez
   nous. Le netting ne fait pas la marge, il évite les surcoûts de rééquilibrage.
3. **Donc la stratégie est de garder l'argent dedans** : recruter des chaînes,
   faire des employés, fournisseurs et clients des utilisateurs.
4. **Le checkout gagne toujours un peu**, prix haut.
5. **CinetPay et MTN restent des filets à perte** sur l'encaissement et le swap.

---

## 6. Ce que ces chiffres imposent au produit

1. **Encaisser passe par l'API marchande de l'opérateur (~1 %), pas par un rail
   généraliste (2,25 %).** Sauf Julaya, moins cher.
2. **Le netting n'est pas une option, c'est la seule source de marge** sur tout ce
   qui traverse. Sans lui, encaissement et swap sont à perte ou à zéro.
3. **Les rails sont le filet, pas la route.** Ils coûtent 2 à 4 fois le netting.
   On les réserve aux cas où une caisse est à sec.
4. **Le règlement Orange à J+5 est une contrainte de trésorerie** : l'argent
   encaissé arrive cinq jours plus tard. À financer, ou à préférer les rails à
   règlement rapide pour ces flux.
5. **Le swap ne porte pas le P&L.** Marché à 1 % qui va vers le gratuit avec le
   PI-SPI. Hameçon, pas rente. Le revenu vient de l'abonnement et de la marge
   nette sur les gros volumes (paie, checkout).
6. **Chaque opérateur a un coût et un délai d'intégration.** MTN : développement
   400 000 à 900 000 FCFA, activation marchande 1 à 3 semaines selon le dossier
   RCCM `[T]`. À multiplier par le nombre de réseaux intégrés. On commence par
   Wave et Orange (les moins chers et les plus utilisés), MTN et Moov ensuite.

> **Contexte fiscal, pour mémoire :** la Côte d'Ivoire taxe le mobile money à
> **7,2 % sur les commissions des opérateurs**, payé par les opérateurs, pas
> facturé en plus à l'utilisateur `[T]`. Cela n'entre pas dans notre coût
> direct, mais explique pourquoi les opérateurs ne descendent pas sous ~1 %.

---

## 7. Ce qui est confirmé, ce qui reste à confirmer

**Confirmé depuis la première version :**

- CinetPay relevé au Chrome réel : payin 1,5–3,5 %, payout 1,5 %.
- MTN marchand : 1,5–2 % en direct, plus un coût d'intégration de 400 000 à
  900 000 FCFA `[T]`.
- Orange marchand : 1 % à J+5, jusqu'à 1,5–2,2 % selon volume `[T]`.

**Reste à confirmer, uniquement par un devis direct :**

- **Hub2** ne publie aucune grille : sur devis, comme Julaya.
- Le **payout exact des opérateurs** (Orange, MTN, Moov) par leur API de
  décaissement.
- Le **coût API marchand Moov**.
- Le délai de règlement de chaque rail (Orange est à J+5, les autres à préciser).

Ces derniers points ne se trouvent pas en source publique : ils se demandent au
commercial, en même temps que le partenariat. Toute la recherche publiquement
disponible est faite.

---

## 8. Sources

- `orange.ci/fr/tarifs-orange-money.html` `[V]` : Orange → Orange 0 F, retrait 1 %.
- `business.orange.ci` API Orange Money : marchand 1 %, règlement J+5, ouverte
  aux développeurs et ESN.
- Pages et blogs tarifaires CI 2026 (Wave, MTN, Moov) `[T]`.
- `wave.com` commissions CI (grille agents, pas client).
- **`cinetpay.com/pricing`** relevé au Chrome réel `[V]`
  (`assets/cinetpay-pricing-2026-08-30.png`) : payin 1,5–3,5 %, payout 1,5 %.
- `business.orange.ci` / `developer.orange.com/apis/om-webpay` : marchand 1 %, J+5.
- Kolonell, momocalc, payatlas (comparateurs) `[T]` : MTN direct 1,5–2 %, coût
  d'intégration 400 000 à 900 000 FCFA, taxe opérateur mobile money 7,2 %.
- Internes : `09_PAYDUNYA_TARIFS.md`, `10_JULAYA_TARIFS.md`, `17_LE_NETTING.md`,
  `18_MODELES_D_ALGORITHME.md`, `19_MODELE_DE_REVENUS.md`.
