# La tontine, produit phare : l'avance garantie

> **REJETÉ PAR LO (30/09/2026).** Zéro confiance : aucun fonds que SwimPay
> financerait, aucun partenaire prêteur, aucune avance. La tontine se vend par sa
> sûreté et son mécanisme, pas par la facilité. Seule décision retenue de ce travail :
> **caution à 25 %** (`31` §6.1). Ce document reste comme trace de la piste écartée.

> Écrit le 30 septembre 2026, à la demande de LO : faire de la tontine un produit
> phare grand public, **attractif, sécurisé, juste, et qui rapporte**. C'est une
> **proposition à valider**. Elle part de la version 3 (`31_TONTINE_CLASSIQUE_SPEC.md`),
> la garde comme cas particulier, et change ce qui l'empêche de se vendre.
>
> Tous les chiffres sortent de `design/pivot/sondes/tontine-v4.py` (entiers XOF,
> argent conservé au franc près, vérifié à chaque tontine jouée). Exemple de
> référence : 10 membres, 10 tours mensuels, mise de 10 000 F.
>
> `[V]` vérifié en source primaire · `[T]` source tierce · `[H]` hypothèse à vérifier.

---

## 1. Le verdict sur la version 3, classé par impact

### 1.1 Bloquant : elle ne fait plus crédit à personne

La v3 est sûre parce que **personne n'a jamais un franc des autres en main**. La
spec le présente comme une qualité (§11.2 : « argent des autres qu'un membre a eu en
main, au plus : 0 F »). C'est aussi ce qui la rend invendable.

| Place 1 | A versé le jour de son gain | Reçoit ce jour-là | Argent des autres en main, au plus | Résultat final |
|---|---|---|---|---|
| Tontine de quartier | 10 000 F | 100 000 F | **90 000 F** | 0 F |
| **SwimPay v3** | 40 000 F | 35 000 F | **0 F** | −3 900 F |

En v3, **être tiré en premier est une mauvaise nouvelle** : le gagnant du tour 1
récupère moins que ce qu'il a versé, et reste à −5 % jusqu'à la fin. Or la tontine
existe pour celui qui a besoin d'une somme **avant** de l'avoir épargnée. Sans lui,
la v3 devient une épargne à date tirée au sort qui coûte 3,9 %. Le mode Épargne
(`32`) fait la même chose sans caution. **La v3 classique est donc battue par notre
propre mode Épargne.**

LO l'avait dit lui-même le 29/09 (`28`, en tête) : *« La tontine est un système
rotatif de prêt, on doit la traiter comme telle, en protégeant les prêteurs. »* La
v3 protège les prêteurs en supprimant le prêt.

### 1.2 Majeur : la caution de 30 % n'achète aucune sécurité

La sonde rejoue les 260 épreuves de la v3 (tous les formats, 5 scénarios de défaut)
avec des cautions plus petites :

| Caution | Perte SwimPay | Honnêtes lésés | Fuites qui rapportent | À payer pour entrer |
|---|---|---|---|---|
| 30 % | 0 | 0 | 0 | 40 000 F |
| 10 % (une mise) | 0 | 0 | 0 | 20 000 F |
| 5 % | 0 | 0 | 0 | 15 000 F |

C'est la **part gardée** qui protège, pas la caution. La caution de 30 % ne fait que
doubler le ticket d'entrée d'un public qui manque justement de liquidités.

### 1.3 Majeur : la protection est taillée tontine par tontine, pour le pire cas

Chaque tontine doit survivre seule au scénario « tous les gagnants fuient ». Avec
une vraie avance, ce scénario coûte **3 622 605 F** sur une seule tontine (30 membres,
30 tours). Aucune réserve par tontine ne porte ça. C'est cette règle, pas un choix de
LO, qui a forcé l'avance à zéro. **Une garantie ne marche qu'en mutualisant des
milliers de tontines**, comme une assurance.

### 1.4 Majeur : le prêteur paie autant que l'emprunteur

En v3, la place 10, qui a avancé son argent pendant 9 mois, paie les mêmes 3 % que la
place 1. Son bonus de 3 % est payé par le groupe entier. Le dernier n'est pas
rémunéré pour avoir prêté, il est simplement moins pénalisé.

### 1.5 L'argent : 30 000 F par tontine, sur un produit que l'emprunteur fuit

La v3 prend le meilleur revenu par tontine de toutes les versions étudiées. Mais le
revenu, c'est ce taux multiplié par le volume, et la v3 retire au volume sa raison
d'être.

### Ce qui reste, et devient la base

Le tirage vérifiable, l'absence de décision humaine, les 20 règles de situation
(`31` §8), la protection contre les escrocs et les pirates (`31` §9), et surtout **la
formule de la part gardée**, qui devient le cœur de la v4.

---

## 2. La proposition en une phrase

> **Ceux qui veulent leur cagnotte tôt paient ceux qui attendent. Un Fonds commun
> garantit que chacun reçoit ce qui lui est promis. SwimPay prend des frais fixes et
> une petite marge.**

La tontine redevient ce qu'elle est : un prêt des derniers aux premiers. La v4 le
rend **explicite, payé et garanti**.

---

## 3. La règle de la version 4 : une seule formule

La formule de la v3 reçoit un terme de plus :

    gardé  =  max(0, mises restantes − caution − avance)
    rendu  =  tout le reste, tout de suite

**L'avance**, c'est l'argent des autres que le gagnant peut avoir en main. Avec une
avance nulle, on retrouve la v3 au franc près (sonde, §11 : 35 000, 75 000 et
125 000 F aux places 1, 5 et 10, identiques à la v3).

L'avance se paie, sur une seule assiette : **l'argent des autres en main, multiplié
par le temps** (en « tours-francs », `28` §2).

| Prix | Taux de référence | Qui paie | Qui reçoit |
|---|---|---|---|
| **Loyer du temps** | 1 % par mois | celui qui a une avance | ceux qui ont avancé leurs mises, au prorata. **Somme nulle entre membres** |
| **Prime de garantie** | 0,4 % par mois | celui qui a une avance | le **Fonds commun** |
| **Marge** | 0,15 % par mois | celui qui a une avance | SwimPay |
| **Frais du système** | 1,5 % de chaque cagnotte | tout le monde, à l'identique | SwimPay |
| **Pénalité** | 5 % de chaque mise couverte | le défaillant | le Fonds commun, qui a payé à sa place |

Les charges de l'avance sont **connues au tirage et prélevées sur la cagnotte** au
gain : elles ne peuvent pas rester impayées.

**Caution : une mise**, rendue à la fin.

### 3.1 L'exemple de référence, place par place

| Place | v3 : versé avant gain → reçu au gain | **v4 : versé avant gain → reçu au gain** | v4 : argent des autres en main, au plus | **v4 : résultat final** | Coût ou rendement |
|---|---|---|---|---|---|
| 1 | 40 000 → 35 000 | **20 000 → 93 106** | 73 106 | −6 894 | TAEG 21,5 % |
| 2 | 50 000 → 45 000 | 30 000 → 94 323 | 64 323 | −5 608 | TAEG 21,3 % |
| 3 | 60 000 → 55 000 | 40 000 → 95 385 | 55 385 | −4 407 | TAEG 21,2 % |
| 5 | 80 000 → 75 000 | 60 000 → 97 043 | 37 043 | −2 263 | TAEG 21,0 % |
| 7 | 100 000 → 95 000 | 80 000 → 98 082 | 18 082 | −459 | TAEG 20,7 % |
| 8 | 110 000 → 105 000 | 90 000 → 98 369 | 8 369 | +314 | TAEG 20,5 % |
| 9 | 120 000 → 115 000 | 100 000 → 98 500 | 0 | +1 001 | **+2,7 % par an** |
| 10 | 130 000 → 125 000 | 110 000 → 111 626 | 0 | **+1 626** | **+3,6 % par an** |

Par tontine : **SwimPay 16 716 F** (frais 15 000 + marge 1 716), **Fonds 4 584 F**,
**loyer passé des premiers aux derniers 11 460 F**.

Le TAEG est celui de l'opération d'avance (l'argent reçu, les charges, les mises qui
le rendent). Il reste **sous le taux d'usure de 24 %** fixé pour les établissements
financiers, les SFD et les autres agents économiques depuis le 1er juin 2026 `[V]`
(BCEAO, avis n°007-12-2025). Le taux d'usure se calcule **frais compris** `[T]`,
d'où le §7.2.

---

## 4. Pourquoi c'est attractif

### 4.1 Pour chaque profil

| Profil | Ce qu'il obtient | Contre quoi on le compare |
|---|---|---|
| **Celui qui a besoin d'argent** (places de devant) | 93 106 F le premier mois pour 20 000 F versés. Coût : 6 894 F pour une avance de 73 106 F, sans dossier ni garant | Le SFD plafonné à 24 % `[V]`, avec dossier ; l'usurier ; la v3 qui lui rend 35 000 F |
| **Celui qui épargne** (places de derrière) | Sa cagnotte, plus un loyer : **+3,6 % par an à la place 10**, autant que le livret réglementé (3,5 % `[T]`, décision de la BCEAO) | La tontine de quartier, qui ne rapporte rien et peut disparaître |
| **Le milieu** (places 4 à 7) | Une somme à une date connue, pour 459 à 3 292 F | La tontine de quartier |
| **Tout le monde** | **Sa cagnotte arrive à la date, même si un membre ne paie pas.** Entrée à 20 000 F au lieu de 40 000 F | Toute tontine existante |

### 4.2 Le parcours qui fait venir les gens

1. **« Choisissez le mois de votre cagnotte ».** Dans les cercles ouverts, on ne
   cherche pas neuf personnes : on dit « je veux 100 000 F en décembre », l'app
   affiche le prix de chaque place, et le système assemble le cercle. C'est le
   modèle de Money Fellows `[T]`. Dans les groupes par invitation, **le tirage
   vérifiable reste**, et chaque place a le prix de sa formule.
2. **« Votre première tontine vous paie, la suivante vous avance ».** Un nouveau
   membre prend naturellement une place de derrière : il gagne le loyer, et prouve
   qu'il paie. C'est ce qui lui ouvre une avance plus grande ensuite (§5.3).
3. **Les saisons** : rentrée scolaire, Tabaski, fêtes de fin d'année. Le mode Projet
   (`32`) paie directement le fournisseur.
4. **Le passeport de régularité** (`23` §8) : chaque mise payée à l'heure est une
   preuve qu'on emporte, vers un crédit partenaire ou à l'étranger.
5. **Les tontiniers deviennent partenaires.** Le collecteur de marché amène ses
   groupes et touche une part des frais ; il ne porte plus d'espèces et ne risque
   plus le vol. Il n'a aucun pouvoir sur l'argent ni sur l'ordre, comme tout
   organisateur (`31` §4).
6. **La tontine d'entreprise**, adossée à la paie SwimPay (`21`) : la mise part le
   jour du salaire. C'est le risque le plus bas, donc l'avance la plus grande.

### 4.3 Les phrases du produit (charte d'écriture)

- « Votre cagnotte dès le premier mois »
- « Choisissez le mois de votre cagnotte »
- « Épargnez et gagnez jusqu'à 3,6 % par an », avec la mention : places de fin de
  cercle.
- « Une cagnotte garantie à la date »

---

## 5. Pourquoi c'est sûr

### 5.1 Les honnêtes ne perdent jamais à cause des autres

Les 260 épreuves de la v3, rejouées en v4 avec l'avance pleine : **0 membre honnête
lésé, écart maximal 0 F.** Quand un membre cesse de payer, sa part gardée, puis sa
caution, puis le Fonds paient ses mises. S'il fait défaut avant son gain, il ne paie
aucune charge d'avance (il n'a rien emprunté) et le Fonds verse à sa place le loyer
promis aux épargnants. **Tout ce qui est affiché à l'entrée est garanti.**

### 5.2 Le vrai risque est chiffré : il est dans le Fonds

La prime qu'il faut au Fonds pour être à l'équilibre dépend du comportement des
membres qui reçoivent une avance (4 000 tontines au hasard par ligne) :

| Qui fuit juste après son gain | Qui s'arrête à un tour au hasard | Prime d'équilibre, sans recouvrement | Avec 30 % recouvrés |
|---|---|---|---|
| 0,5 % | 2 % | 0,36 % par mois | 0,25 % |
| 1 % | 3 % | 0,66 % | 0,46 % |
| 2 % | 5 % | 1,17 % | 0,82 % |
| 5 % | 5 % | 2,06 % | 1,44 % |

Trois leçons :

1. **À 0,4 %, la prime tient avec 0,5 % de fuites et 2 % d'arrêts, plus dès 1 % et
   3 %.** Personne ne connaît ces taux avant le lancement.
2. **Plafonner l'avance ne baisse pas le taux de prime nécessaire** (avance limitée à
   3 mises : 0,36 %, 0,56 %, 1,08 %, 1,82 %). Il baisse la perte en francs, pas la
   perte par franc avancé. **Ce qui baisse la prime, c'est de choisir qui reçoit
   l'avance.**
3. Le budget légal est serré : **loyer + prime + marge ≤ 1,55 % par mois** pour un
   TAEG de 22 %. Si la prime monte, le loyer des épargnants ou la marge baissent.

### 5.3 L'avance se prouve : une formule, sans niveau

LO a supprimé les niveaux le 29/09 (`28` §0). La proposition n'en rétablit pas :
**la même formule pour tous, appliquée à des faits**.

    avance  =  le plus petit de :
               1 mise de départ + la moitié des mises payées à l'heure (24 derniers mois)
                 − les avances déjà en cours dans d'autres tontines          [H]
               30 % des entrées mensuelles venant de tiers × mois restants     [H]
               la part accordée par le robinet (§5.4)

Ce que l'avance change pour la place 1 :

| Avance | Reçoit au gain | En main, au plus | Résultat honnête | S'il fuit après son gain | Perte du Fonds |
|---|---|---|---|---|---|
| 0 (règle de la v3) | 18 500 F | 0 | −1 500 F | −1 500 F | 0 |
| 1 mise (nouveau membre) | 27 446 F | 7 446 | −2 554 F | +7 446 F | 10 000 F |
| 3 mises | 45 431 F | 25 431 | −4 569 F | +25 431 F | 30 000 F |
| 5 mises | 64 036 F | 44 036 | −5 964 F | +44 036 F | 50 000 F |
| 8 mises (avance pleine) | 93 106 F | 73 106 | −6 894 F | +73 106 F | 80 000 F |

Après une tontine de 10 mises payées à l'heure, la formule donne 6 mises d'avance.
**Ce qu'un fuyard peut emporter, c'est son avance, et rien d'autre.** Pour obtenir
l'avance pleine, il doit d'abord payer 14 mises à l'heure. L'avance est calculée **par
identité** : une pièce, un plafond, **quel que soit le nombre de numéros**. C'est la
thèse de SwimPay (un citoyen, plusieurs numéros) qui devient ici une protection :
personne ne cumule des avances en multipliant les téléphones.

**La prime apprend** : elle est recalculée chaque mois sur les pertes mesurées du
Fonds, par une formule publiée `[H]`, sans humain. C'est la règle d'or de LO :
chaque module enregistre tout dès le premier jour et apprend avec les données.

### 5.4 Le robinet : SwimPay ne perd jamais plus que le Fonds

Règle déterministe : **n'accorder une avance nouvelle que si 8 % de l'argent avancé
en cours et promis reste couvert par le Fonds**. Sinon l'avance de chaque nouvelle
tontine est réduite d'autant.

Épreuve : 48 mois, de 50 à 1 000 nouvelles tontines par mois, 0,5 % de fuites et 2 %
d'arrêts, puis **un choc ×4 pendant 8 mois**. Prime fixe de 0,4 %.

| Robinet | Fonds au départ | Fonds à la fin | Point le plus bas | Avance accordée en temps normal |
|---|---|---|---|---|
| Non | 5 000 000 F | **−38 042 066 F** | −38 042 066 F | 100 % |
| Oui | 5 000 000 F | +16 687 106 F | −2 099 930 F | 14 % |
| Oui | 50 000 000 F | +4 261 164 F | −3 509 336 F | 50 % |
| Oui | 150 000 000 F | +106 957 934 F | jamais sous zéro | 100 % |

Ce que ça dit, franchement :

1. **Sans robinet, un choc ruine le Fonds et SwimPay derrière lui.** Avec, la perte
   est bornée par la taille du Fonds.
2. **La taille du Fonds décide combien d'avance SwimPay peut offrir.** Avec 5 M F, le
   produit ne donne que 14 % de l'avance pleine : on est presque revenu à la v3. Il
   faut environ **150 M F** pour offrir l'avance pleine à ce rythme de croissance.
3. **Le choc coûte cher** : avec 150 M F et une prime fixe, le Fonds perd environ
   43 M F sur la période. C'est le vrai risque du produit. La prime qui apprend
   (§5.3) le réduit ; la sonde ne l'a pas encore simulée.
4. Les passages sous zéro avec un petit Fonds sont surtout de la **trésorerie** : des
   mises avancées pour des membres qui n'ont pas encore gagné, rendues par leur
   cagnotte. Il faut une ligne de trésorerie pour ces creux.

### 5.5 Ce qui ne change pas

La protection contre les escrocs et les pirates de la v3 (`31` §9) s'applique telle
quelle : clé dans la puce du téléphone, 72 heures sur un nouvel appareil, sortie
seulement vers un compte au nom du membre, aucun employé ne peut déplacer l'argent.

---

## 6. Pourquoi c'est juste

1. **Le prix suit le service rendu** : on paie pour l'argent des autres qu'on a eu en
   main, et le temps pendant lequel on l'a eu. Rien d'autre.
2. **Le loyer est une somme nulle entre membres** : ce que paient les premiers va aux
   derniers. SwimPay n'y touche pas.
3. **La part de SwimPay est fixe et affichée** : 1,5 % de la cagnotte, 0,15 % par mois
   d'avance.
4. **La même formule pour tous** : seuls les faits changent (ce qu'on a déjà payé à
   l'heure), jamais un statut, jamais une décision humaine.
5. **Chacun voit ses propres chiffres avant de signer**, place par place, et le prix
   des autres places.
6. **Le défaillant ne perd que le tort causé et sa pénalité** (règle de la v3, gardée).
7. **Option sans loyer** `[H]`, pour ceux qui refusent l'intérêt pour des raisons
   religieuses : le créateur la choisit à la création (`28` §3.2). Sans loyer, les
   derniers ne gagnent rien, comme dans la tontine de quartier, et la prime de
   garantie devient un forfait par place. À faire valider par des autorités
   religieuses.

---

## 7. Ce que SwimPay gagne

### 7.1 Par tontine, selon les frais du système

Lecture « service » : les frais du système sont identiques pour toutes les places et
tous les modes, donc un service, hors TAEG `[H]`. Loyer 1 %, prime 0,4 %, marge 0,15 %
par mois.

| Frais du système | SwimPay par tontine | Place 1 | Place 10 | TAEG tout compris, place 1 |
|---|---|---|---|---|
| 1 % | 11 744 F | −6 456 F | +2 175 F (+4,8 %/an) | 26,4 % |
| **1,5 %** | **16 716 F** | −6 894 F | +1 626 F (+3,6 %/an) | 28,5 % |
| 2 % | 21 692 F | −7 332 F | +1 077 F (+2,4 %/an) | 30,8 % |
| 3 % | 31 636 F | −8 208 F | −21 F (0 %) | 35,3 % |
| v3 (rappel) | 30 000 F | −3 900 F, sans avance | −900 F | — |

**Chaque demi-point de frais rapporte 5 000 F de plus à SwimPay par tontine, et coûte
environ 550 F à chaque épargnant.** Je recommande **1,5 %** au lancement : les
dernières places rapportent autant qu'un livret, c'est la phrase qui vend.

### 7.2 Si le juriste compte les frais dans le TAEG

La dernière colonne passe alors au-dessus de 24 %. La structure de repli garde le
même revenu : **l'avance seulement pour les places 1 à 5, sans frais du système ;
3 % de frais pour les places 6 à 10, qui n'ont pas d'avance.**

| Place | 1 | 2 | 3 | 5 | 6 | 8 | 10 |
|---|---|---|---|---|---|---|---|
| Résultat | −5 580 F | −4 274 F | −3 055 F | −884 F | −2 000 F | −1 134 F | +1 F |
| Coût ou rendement | TAEG 21,5 % | 21,4 % | 21,2 % | 21,0 % | −10,8 %/an | −3,7 %/an | 0 % |

**SwimPay 16 650 F par tontine.** La lecture juridique change qui paie, pas combien
SwimPay gagne. Les places du milieu y perdent en attrait.

### 7.3 Par membre et par an

| Mise mensuelle | SwimPay par tontine | Par membre et par an | v3, pour comparer |
|---|---|---|---|
| 10 000 F | 16 716 F | 2 005 F | 3 600 F |
| 25 000 F | 41 794 F | 5 015 F | 9 000 F |
| 50 000 F | 83 592 F | 10 031 F | 18 000 F |

Le revenu par membre baisse de 44 % par rapport à la v3. **La v4 doit donc faire au
moins 1,8 fois le volume de la v3 pour rapporter autant.** La v3 n'a pas de raison
d'attirer celui qui a besoin d'argent ; la v4 est construite pour lui.

À titre d'ordre de grandeur `[H]` : 100 000 membres actifs à 25 000 F par mois
donnent 500 M F par an ; 500 000 membres, 2,5 Md F. Money Fellows revendique 1 million
de clients et 350 000 actifs par mois `[T]` (`23` §1.2).

### 7.4 Ce qui rapporte autour de la tontine

La tontine est un **moteur d'acquisition** avant d'être une ligne de revenu :

1. **Chaque cercle ouvre dix comptes identifiés** qui reçoivent de l'argent chaque
   mois. C'est la base de tout le reste : transferts, paie, paiement marchand.
2. **L'encours des tontines** (cagnottes en attente, parts gardées, cautions) reste
   chez le partenaire EME : un levier de négociation sur ses revenus de placement
   `[H]`.
3. **Le passeport de régularité** alimente le crédit et l'assurance de partenaires
   agréés, contre une commission (`33`, même logique que l'épargne rémunérée) `[H]`.
4. **Le mode Projet** amène des commerçants, qui paient 1 % d'encaissement (`32`).
5. **La tontine d'entreprise** se vend en abonnement avec la paie (`21`).

---

## 8. Le lancement, en trois temps

**Avant tout** : trois questions au juriste et au partenaire EME, qui décident de la
structure. (1) La tontine avec avance est-elle une opération de crédit, et qui en est
le prêteur : les membres entre eux, ou un établissement ? (2) Les frais du système
entrent-ils dans le TAEG ? (3) Le Fonds commun est-il une activité d'assurance ou une
garantie qu'un établissement agréé doit porter ? La voie la plus propre, dans la
logique de `33` : **un partenaire agréé porte le Fonds (et l'avance si besoin),
SwimPay opère et distribue** `[H]`.

| Temps | Ce qu'on ouvre | Pourquoi |
|---|---|---|
| **1. Lancement** | Mode Épargne ; tontine classique **par invitation**, tirage vérifiable, avance de départ d'une mise pour tous ; Fonds de départ, montant fixé par LO | Petit risque, on mesure les vrais taux de fuite et d'arrêt |
| **2. Montée** | Cercles ouverts « choisissez votre mois », prix par place ; tontiniers partenaires ; tontine d'entreprise | La prime et le robinet se règlent sur les données du temps 1 |
| **3. Échelle** | Passeport vers le crédit partenaire ; diaspora ; échange de places entre membres | Le Fonds a la taille de l'ambition |

---

## 9. Ce que LO doit trancher

Plusieurs points reviennent sur des décisions déjà prises. Je les signale un par un.

- [ ] **La tontine fait crédit** (l'avance). Revient sur la v3 (« 0 F en main »).
- [ ] **Caution d'une mise** au lieu de 30 %. Revient sur la décision du 29/09 ; les
      épreuves montrent que la sécurité est la même.
- [ ] **Frais du système** : 1,5 % (recommandé), 2 % ou 3 %, plus la marge de 0,15 %
      par mois. Revient sur les 3 % de la tontine classique ; Épargne et Projet
      peuvent rester à 3 %.
- [ ] **L'avance se prouve** par la formule du §5.3 : aucun niveau, aucun nom de
      statut, les mêmes règles pour tous.
- [ ] **Cercles ouverts à places choisies**, avec prix affiché, en plus du tirage.
      Revient sur « la rotation par tirage au sort » (`23` §13.1) pour ce seul mode.
- [ ] **Le Fonds commun** : sa mise de départ (c'est la perte maximale de SwimPay),
      et qui garde son surplus. Je recommande que SwimPay n'en garde rien au départ :
      SwimPay reste opérateur, pas assureur.
- [ ] **Le loyer du temps**, et l'option sans loyer.
- [ ] **La structure juridique** du §8.

---

## 10. Ce que la sonde ne sait pas

- **Les taux de fuite et d'arrêt réels.** Ils sont des paramètres, pas des mesures.
  Seul le lancement les donnera, d'où le temps 1.
- **Les retardataires qui reviennent** : la v4 les traite comme la v3 (`31` §6.4),
  la sonde ne les simule pas.
- **La prime qui apprend** n'est pas encore simulée ; le robinet l'est.
- **L'attrait** ne se simule pas. Les chiffres disent ce que chacun gagne ; seul un
  test de marché dira si c'est assez.
- **La contrainte physique** et la SIM dupliquée restent ouvertes (`31` §13).
