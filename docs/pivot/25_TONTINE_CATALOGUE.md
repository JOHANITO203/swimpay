# Le catalogue des tontines — des formats maîtrisés, et leurs règles

> Écrit le 29 septembre 2026, sur la consigne de LO : **1, 2 ou 3 gagnants par tour
> au plus**, selon le nombre de membres ; un **nombre de membres plafonné** ; des
> **règles mathématiques** qui couvrent tous les scénarios ; des **noms** pour les
> types et les règles, qui rendent le produit vivant. Et surtout : **ne proposer
> que des formats déjà maîtrisés**, et n'en créer de nouveaux qu'après les avoir
> éprouvés.
>
> Complète `24_TONTINE_EVENEMENT.md` (les arnaques et les modules). L'épreuve est
> faite par `design/pivot/sondes/tontine-scenarios.py`, qui énumère tous les formats
> et fait subir à chacun le pire des scénarios.
>
> `[H]` = proposition à valider.

---

## 1. Les règles mathématiques

Soit *N* le nombre de membres, *T* le nombre de tours, *B* le nombre de gagnants par
tour, *c* la cotisation.

| Règle | Formule | Pourquoi |
|---|---|---|
| Chacun gagne exactement une fois | **N = B × T** | Pas de membre oublié, pas de double gain |
| Gagnants par tour | **B ∈ {1, 2, 3}**, **le plus petit possible** qui fait tenir l'événement dans son nombre de tours maximal | La décision de LO : accélérer la prise quand le groupe est grand, pas plus |
| Collecte d'un tour | **N × c** | |
| Ce que reçoit un gagnant | **N × c / B = T × c** | Chacun reçoit exactement ce qu'il cotise au total |
| Ce que doit encore le gagnant du tour *k* | **(T − k) × c** | C'est ce que la retenue doit protéger |
| Taille maximale | **N ≤ 30** | Au-delà, le tirage en direct et le suivi perdent leur sens, et le risque d'une bande grandit |
| Plafond de solde | **si T × c > 2 000 000 F**, la prise est versée sur la banque du gagnant | Plafond de la monnaie électronique `[V]` |

**Conséquence sur les tailles permises.** Un nombre de membres n'est permis que si
l'une des trois valeurs de *B* le divise et fait tenir l'événement dans ses tours.
Par exemple, en Éclair (7 tours au plus) : 10 membres donne **2 gagnants sur 5
jours** ; 21 membres donne **3 gagnants sur 7 jours** ; 11 ou 13 membres sont
**refusés**, faute de diviseur. L'app ne propose que les tailles permises.

---

## 2. Les formats : un rythme et une taille

### 2.1 Trois rythmes

| Nom | Un tour par | Tours | Cotisation | L'esprit |
|---|---|---|---|---|
| **Éclair** | jour | 3 à 7 | 1 000 à 25 000 F | L'événement de la semaine : ça va vite, on suit le tirage chaque jour |
| **Relais** | semaine | 3 à 8 | 5 000 à 100 000 F | Le passage de témoin, sur un ou deux mois |
| **Marathon** | mois | 3 à 12 | 10 000 à 200 000 F | La longue tontine, pour les gros projets |

### 2.2 Trois tailles

| Nom | Membres |
|---|---|
| **Cercle** | 2 à 10 : les proches, les collègues |
| **Clan** | 11 à 20 : le quartier, l'association |
| **Tribu** | 21 à 30 : la grande communauté |

Un format se nomme par les deux : **Éclair Cercle**, **Relais Clan**, **Marathon
Tribu**. L'exemple de LO (10 membres, 10 000 F, 5 jours) est un **Éclair Cercle**.

Au total, les règles permettent **48 formats**, tous listés par le simulateur.

### 2.3 Les niveaux de confiance

Le niveau d'un membre décide combien il peut recevoir en avance (module 6 de `24`).
Il se gagne en terminant des tontines.

| Niveau | Nom | Comment on y arrive `[H]` | Découvert autorisé |
|---|---|---|---|
| 1 | **Pousse** | Entrée : pièce d'identité et preuve des fonds | **aucun** : sa retenue et sa caution couvrent tout |
| 2 | **Tronc** | Deux événements terminés sans aucun retard | une cotisation |
| 3 | **Baobab** | Cinq événements terminés, dont un Relais ou un Marathon | deux cotisations |

---

## 3. Les règles, nommées

Chaque règle du système porte un nom, que l'utilisateur apprend en jouant :

| Nom | Ce que c'est | Module de `24` |
|---|---|---|
| **Le Pacte** | L'accord signé à l'entrée, figé au tirage | 3 |
| **Le Tirage du groupe** | Le tirage en direct, où chaque membre connecté ajoute son geste au hasard | 4 |
| **Le Coffre** | L'argent de l'événement, que personne ne peut toucher, pas même l'organisateur | 5 |
| **La Prise protégée** | Le gagnant reçoit sa prise, moins la retenue qui paie ses cotisations restantes | 6 |
| **Le Filet** | Retenue, caution, fonds de garantie, puis SwimPay : le gagnant reçoit toujours sa prise complète | 7 |
| **Le Carnet** | Le journal de l'événement, visible par tous, impossible à modifier | 9 |
| **La Réputation** | Pousse, Tronc, Baobab : ce que chaque membre emporte d'un événement à l'autre | 2 |

---

## 4. L'épreuve : chaque format passé au pire scénario

### 4.1 Le pire scénario

Une **bande** : les gagnants des premiers tours, jusqu'à un tiers des tours, cessent
de payer **juste après avoir touché**. Le simulateur déroule le temps tour par tour :
chaque cotisation manquante est couverte par la retenue du défaillant, puis sa
caution, puis le fonds de garantie **tel qu'il est à ce moment** (il se remplit au fil
des tours), puis SwimPay. Un niveau n'est accordé dans un format que si **le recours
à SwimPay reste sous un plafond fixé**.

### 4.2 Ce que l'épreuve a montré

**Au niveau Pousse, aucun des 48 formats ne demande un seul franc de recours, dans
aucun scénario.** Le système est sûr pour tout le monde, même entre inconnus : c'est
ce qui permet d'ouvrir des tontines à des gens qui ne se connaissent pas.

Le prix de cette sécurité : un membre Pousse **ne reçoit pas d'avance**. Tiré tôt, il
touche à peu près ce qu'il a déjà engagé. Pour lui, la tontine est une **épargne à
suspense** : zéro risque, un tirage à suivre, et une réputation qui monte. C'est en
devenant Tronc puis Baobab qu'il gagne le droit de toucher avant d'avoir payé.

**L'avance des niveaux supérieurs dépend de la taille du fonds de garantie** :

| Fonds de garantie | Recours SwimPay au plus | Formats où un **Tronc** passe | Formats où un **Baobab** passe |
|---|---|---|---|
| 1 % | 0 % | 0 / 48 | 0 / 48 |
| 1 % | 2 % | 7 / 48 | 0 / 48 |
| 2 % | 2 % | 23 / 48 | 0 / 48 |
| **3 %** | **2 %** | **32 / 48** | **2 / 48** |
| 5 % | 0 % | 32 / 48 | 2 / 48 |
| 5 % | 2 % | 43 / 48 | 12 / 48 |

**Le fonds de garantie n'est pas un coût** : il appartient aux membres, et ce qui n'a
pas servi leur est **rendu à la clôture**. Pour un membre honnête, un fonds de 3 %
n'est que de l'argent bloqué le temps de l'événement.

### 4.3 La règle du moteur

L'app ne propose à un membre **que l'avance que son format a prouvé pouvoir couvrir**.
Si le format ne passe pas l'épreuve pour son niveau, il est traité comme une Pousse
dans ce format-là. Aucune décision à la main : le moteur applique le résultat de
l'épreuve.

---

## 5. Tous les autres événements à contrôler

| Événement | La règle |
|---|---|
| **Le groupe ne se remplit pas** | Délai de recrutement : 24 h en Éclair, 3 jours en Relais, 7 jours en Marathon `[H]`. Passé ce délai, l'événement est **annulé** et tout ce qui a été bloqué est rendu |
| **Un membre échoue au test d'éligibilité** | Sa place se libère ; le recrutement continue dans le même délai |
| **Un membre veut partir avant le tirage** | Il récupère tout ce qu'il a bloqué |
| **Un membre veut partir après le tirage** | Impossible : le Pacte est figé (module 3 de `24`) |
| **Retard de cotisation** | Délai de grâce proportionné au rythme : quelques heures en Éclair, un jour en Relais, trois jours en Marathon `[H]` ; puis le Filet |
| **Décès ou incapacité** | Clause du Pacte : un proche désigné reprend la place, ou remboursement de ce qui a été versé moins ce qui a été reçu |
| **L'organisateur disparaît** | L'événement continue seul |
| **Litige** | Le Carnet fait foi ; arbitrage SwimPay |
| **Clôture** | Cautions et fonds non utilisé rendus ; la Réputation de chacun est mise à jour |

---

## 6. Faire évoluer le catalogue

Le catalogue est **fermé** : on ne propose que ce qui a passé l'épreuve.

Pour ajouter un format (un nouveau rythme, une autre taille, une autre règle de
gain), on l'ajoute d'abord au simulateur, on le passe au pire scénario, et on ne
l'ouvre aux utilisateurs que s'il passe. **C'est la règle de LO : maîtriser avant de
créer.**

---

## 7. À trancher par LO

- [ ] **Le fonds de garantie** (3 % proposé, rendu à la clôture) et le **plafond de
      recours SwimPay** (2 % proposé).
- [ ] Les **bornes** des rythmes : tours et cotisations.
- [ ] Les **noms** : Éclair, Relais, Marathon ; Cercle, Clan, Tribu ; Pousse, Tronc,
      Baobab. À garder, à changer, ou à mettre en nouchi ?
- [ ] Les conditions de passage d'un niveau à l'autre.
- [ ] Les délais de recrutement et de grâce.
