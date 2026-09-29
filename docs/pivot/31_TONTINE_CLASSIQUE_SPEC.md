# La tontine classique SwimPay — spécification complète, soumise à relecture

> Document autonome, écrit le 29 septembre 2026 pour être relu par d'autres IA.
> Il rassemble les décisions prises dans `23` à `30`. En cas de désaccord avec ces
> documents, **celui-ci fait foi**.
>
> Légende : `[V]` vérifié en source · `[T]` source secondaire · `[H]` hypothèse
> à vérifier. Rien n'est codé ; les chiffres viennent de simulations en entiers XOF
> (scripts cités en §10).

---

## 1. Le contexte

**SwimPay** est une application ivoirienne de compte de paiement. Le client a un
compte SwimPay, qu'il recharge depuis ses comptes Mobile Money (Orange, MTN, Moov,
Wave) et bancaires, et depuis lequel il paie et envoie. **Les fonds sont détenus
par un partenaire émetteur de monnaie électronique agréé**, sur un compte dédié
adossé à 100 %. SwimPay n'est pas une banque et ne prête pas son propre argent.

Plafonds de monnaie électronique dans l'UEMOA `[V]` : 2 000 000 F de solde pour un
porteur identifié, 10 000 000 F de recharges par mois.

**La tontine** est une pratique d'épargne collective très répandue : chaque membre
verse la même somme à chaque tour, et à chaque tour un membre (ou plusieurs)
touche la cagnotte. Son défaut majeur : **celui qui touche tôt peut disparaître
avec l'argent des autres.**

L'objectif : une tontine en ligne **sûre, juste, et qui fonctionne sans aucune
intervention humaine**.

---

## 2. Les principes posés par le fondateur

1. **Aucun humain ne décide.** Ni le fondateur, ni un employé, ni l'organisateur.
   Chaque situation a sa règle écrite d'avance, appliquée par le code.
2. **La même règle pour tout le monde.** Pas de niveaux, pas de statut, pas de
   passe-droit.
3. **Rien ne bloque le système.** Même une fraude détectée ne l'arrête pas : elle
   est rendue non rentable.
4. **Deux modes d'entrée, mêmes règles** : *global* (on rejoint des inconnus) et
   *par invitation* (entre proches, où se font en réalité la plupart des arnaques).
5. **La tontine est un prêt tournant** : celui qui gagne tôt emprunte à ceux qui
   gagnent tard. Il faut protéger les prêteurs, empêcher le premier de partir, et
   éviter que le dernier se sente lésé.
6. **SwimPay ne doit jamais porter un risque qui peut le mettre en faillite.**

---

## 3. Les formats permis

N membres, T tours, B gagnants par tour, c la cotisation par tour.

- **N = B × T** : chaque membre gagne exactement une fois.
- **B ∈ {1, 2, 3}**, le plus petit qui permet de tenir dans le nombre de tours
  maximum du rythme.
- **N ≤ 30.**
- Cagnotte d'un gagnant = N × c / B = **T × c**, soit exactement ce qu'il cotise
  au total.

| Rythme | Un tour par | Tours | Cotisation |
|---|---|---|---|
| Rapide | jour | 3 à 7 | 1 000 à 25 000 F |
| Hebdomadaire | semaine | 3 à 8 | 5 000 à 100 000 F |
| Mensuel | mois | 3 à 12 | 10 000 à 200 000 F |

Ces règles donnent **48 formats**. Un format n'est proposé qu'après avoir passé le
pire scénario du simulateur (§9). Une cagnotte qui ferait dépasser le plafond de
monnaie électronique est versée sur la banque du gagnant.

---

## 4. Le déroulé d'une tontine

1. **Création.** Un membre choisit un format, un montant, un mode. Il n'a ensuite
   **aucun pouvoir** : ni sur l'argent, ni sur l'ordre, ni sur les règles.
2. **Recrutement.** Les places se remplissent. Si le groupe n'est pas complet dans
   le délai, la tontine est annulée et tout est rendu.
3. **Entrée de chaque membre** :
   - pièce d'identité, avec photo du visage en direct comparée à la pièce ;
     **une pièce = une personne = une place** ;
   - **caution de 35 % de la cagnotte, bloquée tout de suite** (§5.1) ;
   - première cotisation bloquée tout de suite ;
   - avant de signer, il voit **ses propres chiffres** : ce qu'il paie, ce qu'il
     recevra, ce qu'il pourra retirer le jour du gain, les frais, ce qui se passe
     s'il ne paie pas ;
   - signature du **Pacte** (les règles) par code secret.
   Il peut partir **avant le tirage** : tout lui est rendu.
4. **Tirage.** L'ordre des gagnants est tiré au sort **une fois pour toutes**
   (§6). Ensuite, plus rien ne change : montant, rythme, membres, ordre. Le Pacte
   est scellé par une empreinte.
5. **Les tours.** À chaque échéance, la cotisation de chaque membre est prélevée
   automatiquement. Le ou les gagnants du tour touchent leur cagnotte selon la
   règle de retrait (§5.2).
6. **Clôture.** Les cautions et la réserve de secours sont rendues aux membres qui
   ont tout payé, le bonus des derniers est versé (§5.4).

---

## 5. Les règles d'argent

### 5.1 La caution

- **35 % de la cagnotte**, versée à l'entrée, **gelée pendant toute la tontine**,
  quel que soit le rang de tirage.
- Rendue entière à la clôture à celui qui a tout payé.
- Celui qui fuit après avoir gagné **la perd** : elle couvre d'abord ses
  cotisations manquées, **le reste revient aux membres honnêtes**.

### 5.2 Ce que le gagnant peut retirer le jour du gain

> **Ce qu'il a déjà versé en cotisations, plus 5 % de la cagnotte.**

Le reste de sa cagnotte est **bloqué** et **paie automatiquement ses cotisations
suivantes**. Ce qui reste bloqué est un peu inférieur à ce qu'il doit encore : il
complète de sa poche en fin de tontine.

Exemple : 10 membres, 10 tours, 10 000 F par tour, cagnotte de 100 000 F.

| Gagnant du tour | A déjà versé | Retire tout de suite | Argent des autres en main |
|---|---|---|---|
| 1 | 10 000 | 15 000 | 5 000 |
| 5 | 50 000 | 55 000 | 5 000 |
| 10 | 100 000 | 100 000 | 0 |

**Aucun gel de l'argent retiré** : le fondateur l'a écarté, parce que l'intérêt
d'une tontine est de toucher une somme utilisable.

### 5.3 La réserve de secours

- **2 % de chaque tour**, mis de côté.
- Elle paie les cotisations d'un défaillant quand sa part bloquée et sa caution ne
  suffisent pas.
- Ce qui reste est **rendu à la clôture** aux membres qui ont tout payé.

### 5.4 Le bonus des derniers

- Chaque gagnant du **dernier tiers des tours** reçoit **3 % de la cagnotte** en
  plus (sur l'exemple : tours 8, 9 et 10, soit 3 000 F chacun).
- Il est **payé par le groupe** à la clôture, sur la réserve restante et les
  cautions saisies, puis sur les remboursements des membres honnêtes. Le Pacte le
  dit comme tel : ce n'est pas un cadeau de SwimPay.

### 5.5 Les frais du système

- **3 % de la cagnotte, prélevés au gain.** C'est le seul revenu de SwimPay sur la
  tontine ; SwimPay ne gagne jamais sur les cautions ni sur la réserve.
- Justification donnée au client : c'est ce qui garantit que personne ne part avec
  l'argent. Repère : le collecteur de tontine garde environ une mise par mois, soit
  ~3 % `[H]`.
- Comparaison : Money Fellows (Égypte) facture jusqu'à 16 % aux premières places,
  0 % au milieu, avec un cashback pour les 3 dernières `[V]`. Son modèle fait payer
  une vraie grosse avance ; le nôtre n'en donne pas, d'où un taux uniforme.

### 5.6 Qui couvre une cotisation manquante, dans l'ordre

1. la part bloquée du défaillant ;
2. sa caution ;
3. la réserve de secours ;
4. SwimPay, en dernier recours, dans un plafond fixé (2 % de la collecte proposés).
   **Dans toutes les simulations, SwimPay n'a jamais payé** (§9).

---

## 6. Le tirage

- SwimPay publie d'abord **l'empreinte** de son propre nombre au hasard.
- Chaque membre connecté ajoute son **geste** (une contribution au hasard).
- Le résultat combine tout, s'affiche en direct, et il est **définitif**.
- Chaque membre peut refaire le calcul et vérifier.
- Interrompu (réseau, application fermée), il reprend avec la même empreinte, sans
  possibilité de retirer le résultat.
- **Pur hasard, dans les deux modes.** Aucune place choisie, aucune place négociée.

---

## 7. Chaque situation a sa règle

| # | Situation | La règle |
|---|---|---|
| 1 | Le groupe ne se remplit pas | Annulation, tout est rendu |
| 2 | Un membre part avant le tirage | Tout lui est rendu |
| 3 | Un membre veut partir après le tirage | Impossible, le Pacte est scellé |
| 4 | Une cotisation manque, **quelle qu'en soit la cause** | Délai de grâce selon le rythme, puis la couverture du §5.6. Le système ne cherche pas le motif |
| 5 | Le défaillant **n'a pas encore gagné** | Il n'a pris l'argent de personne. À son tour, sa cagnotte est entièrement bloquée : elle paie ses cotisations manquées et rembourse la réserve ; le reste lui est rendu à la clôture |
| 6 | Le défaillant **a déjà gagné** | Sa part bloquée puis sa caution couvrent ses cotisations ; le reste de la caution revient aux honnêtes. **Sa dette le suit** : toute entrée future sur son compte SwimPay la rembourse d'abord `[H]` |
| 7 | Décès ou incapacité | Traité comme la ligne 4 ; ce qui revient au membre est versé sur son compte SwimPay, et la succession se règle au niveau du compte, selon la loi |
| 8 | « J'ai payé » | Le journal de la tontine (le Carnet), visible par tous, fait foi. Aucune capture d'écran n'est une preuve |
| 9 | « Le tirage est truqué » | Chacun peut le vérifier dans l'application |
| 10 | « Je n'avais pas compris » | Le Pacte signé, avec ses propres chiffres affichés avant la signature, fait foi |
| 11 | Panne de SwimPay ou d'un opérateur à l'échéance | La tontine est suspendue, l'horloge s'arrête, personne n'est compté en retard |
| 12 | Erreur prouvée de SwimPay | Compensation automatique par une réserve d'incidents de SwimPay |
| 13 | Écart entre le registre et le solde réel chez le partenaire | Faute de SwimPay par définition : la réserve d'incidents comble l'écart, la tontine continue ; au-delà, suspension |
| 14 | Cotisation payée en double | La seconde est rendue automatiquement |
| 15 | Un versement échoue en route | Jamais relancé à l'aveugle : on vérifie ce qui est parti, puis on complète. Un versement ne part qu'une fois |
| 16 | Une recharge par carte bancaire annulée après coup | L'argent rechargé par carte n'entre dans une tontine qu'après un délai de sécurité |
| 17 | Une cagnotte dépasserait le plafond de monnaie électronique | Versée sur la banque du gagnant |
| 18 | Une autorité judiciaire gèle un membre | Ses fonds sont gelés selon l'ordre ; pour la tontine, c'est la ligne 4 |
| 19 | Comptes liés dans la même tontine (même appareil, mêmes sources d'argent, argent qui circule entre eux) | **Ils comptent comme une seule personne** : leur argent des autres en main est limité ensemble à ce qu'une seule personne pourrait avoir. Rien n'est bloqué |

---

## 8. La protection contre les escrocs et les pirates

**Contre les escrocs** (ceux qui trompent des personnes) :

- une tontine SwimPay **n'existe que dans l'application** : on ne paie jamais
  ailleurs, et l'application le dit ;
- chaque retrait de la tontine demande **le code ou l'empreinte, sur l'appareil
  habituel** ;
- **nouvel appareil, carte SIM changée ou nouveau compte de retrait : 72 heures
  d'attente** pour l'argent de la tontine, avec alerte sur l'ancien appareil ;
- l'argent de la tontine **ne sort que vers un compte au nom du membre**, vérifié
  par le nom que renvoie l'opérateur ou la banque ;
- SwimPay **n'envoie jamais de lien par SMS et n'appelle jamais pour demander un
  code** ; un gain s'annonce uniquement dans l'application ;
- **aucun employé ne peut déplacer l'argent** ni changer un ordre ou un montant.

**Contre les pirates** (ceux qui attaquent la machine) :

- chaque opération d'argent est **signée par une clé qui ne quitte jamais la puce
  de sécurité du téléphone** ;
- l'application vérifie qu'elle est l'originale ; les écrans de code ne peuvent pas
  être filmés ;
- chaque demande porte un numéro unique et une heure : une demande rejouée est
  refusée ;
- un « paiement reçu » d'un partenaire n'est cru qu'après vérification de sa
  signature **et** confirmation auprès du partenaire ;
- le registre de l'argent est **en ajout seul et chaîné** : toute modification se
  voit ; il doit égaler chaque jour le solde réel chez le partenaire ;
- données chiffrées, pièces d'identité chiffrées à part.

---

## 9. Ce qui a été simulé

### 9.1 Le pire cas sur les 48 formats

Scénario : **le tiers des premiers gagnants fuit juste après avoir touché.** Règle
de retrait du §5.2, réserve de 2 %, **sans même compter la caution** :

| Avance au gain | Réserve | Formats où SwimPay ne paie jamais rien |
|---|---|---|
| **5 %** | **2 %** | **48 sur 48** |
| 10 % | 3 % | 31 sur 48 |
| 15 % | 3 % | 8 sur 48 |

C'est ce qui a fixé l'avance à 5 %.

### 9.2 Cinq scénarios complets, avec toutes les règles

Exemple : 10 membres, 10 tours, 10 000 F, caution de 35 000 F, frais de 3 %. Le
résultat est ce que chacun a reçu moins ce qu'il a versé, à la fin. L'argent est
vérifié au franc près.

| Scénario | Chaque membre honnête | Chaque fuyard | SwimPay |
|---|---|---|---|
| Tout le monde paie | −3 900 F ; les 3 derniers −900 F | — | +30 000 F, perte 0 |
| Un membre pas encore gagnant abandonne au tour 4 | −3 778 à −778 F | −5 000 F | +30 000 F, perte 0 |
| Le gagnant du tour 1 fuit | −1 000 à +2 000 F | **−30 000 F** | +30 000 F, perte 0 |
| Les 3 premiers gagnants fuient | **+7 286 à +10 286 F** | **−30 000 F chacun** | +30 000 F, perte 0 |
| Le pire : les 3 premiers fuient, et un autre abandonne | +9 333 à +12 333 F | −30 000 F chacun, −5 000 F | +30 000 F, perte 0 |

Lecture : **fuir fait perdre 30 000 F** ; quand des gagnants fuient, les honnêtes
**gagnent** de l'argent, parce que les cautions saisies leur reviennent.

---

## 10. Les limites connues, dites franchement

1. **Le premier gagnant ne touche pas « une grosse somme » utilisable.** Sur
   100 000 F, il peut en retirer 15 000 F le jour du gain, dont 5 000 F seulement
   sont l'argent des autres. Toute avance plus grosse est de l'argent que le
   groupe peut perdre. La caution ne change pas ce calcul : c'est son propre
   argent.
2. **La caution de 35 % exclut** ceux qui n'ont pas cette somme d'avance, c'est-à-
   dire une partie de ceux qui ont le plus besoin d'une tontine.
3. **Quand tout va bien, chaque membre paie 3 900 F sur 100 000 F** (frais et part
   du bonus). Une tontine de quartier ne coûte rien.
4. **Saisir tout le reste de la caution** d'un fuyard peut dépasser le tort causé :
   un juge pourrait réduire cette sanction `[H]`.
5. **Rembourser une dette sur les entrées futures du compte** demande une clause
   acceptée par le partenaire EME `[H]`.
6. **La nature juridique** : une tontine organisée en ligne avec des fonds détenus
   pourrait être vue comme de la collecte d'épargne, activité réservée `[H]`.
7. **La carte SIM dupliquée** n'est détectable que si l'opérateur fournit
   l'information `[H]`.
8. **La contrainte physique** (quelqu'un forcé de retirer avec son propre
   téléphone) n'est pas couverte.
9. Les simulations supposent que les honnêtes paient à l'heure ; **les retards
   sans fuite** (payer en retard puis rattraper) n'ont pas été simulés.

Scripts : `design/pivot/sondes/tontine-scenarios.py` (catalogue),
`tontine-retrait.py` (§9.1), `tontine-scenarios-frais.py` (§9.2),
`tontine-pret.py` (la tontine comme prêt).

---

## 11. Ce qu'on demande aux relecteurs

1. **Y a-t-il une façon de voler de l'argent** (à un membre, au groupe, ou à
   SwimPay) que ces règles laissent passer ? Donnez le scénario pas à pas.
2. **Une règle est-elle injuste** envers une place de tirage, ou envers un type de
   membre ?
3. **Une situation n'a-t-elle pas de règle**, et demanderait donc un humain ?
4. **La caution de 35 %, l'avance de 5 %, la réserve de 2 %, le bonus de 3 %, les
   frais de 3 %** : lequel changeriez-vous, pour quelle valeur, et pourquoi ?
5. **Le produit reste-t-il attractif** face à une tontine de quartier gratuite ?
6. Quels **risques juridiques** en Côte d'Ivoire et dans l'UEMOA voyez-vous ?

Merci de distinguer ce qui est **bloquant** de ce qui est un **détail**.
