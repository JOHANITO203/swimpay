# La tontine classique SwimPay — spécification complète, version 2

> Document autonome, pour relecture par d'autres IA. **Version 2.1 (29/09/2026)** :
> la cagnotte du gagnant garde désormais de côté **toutes** ses mises restantes
> (décision de LO après la démo, §6.2). **Version 2**,
> réécrite après les relectures de Gemini et DeepSeek sur la version 1 : les règles
> sont rendues explicites, les situations oubliées ont reçu une règle, et **chaque
> question posée reçoit une réponse au §12**.
>
> Légende : `[V]` vérifié en source · `[T]` source secondaire · `[H]` hypothèse à
> vérifier. Rien n'est codé. Les chiffres viennent de simulations en entiers XOF,
> où la conservation de l'argent est vérifiée au franc près (§11).

---

## 1. Le contexte

**SwimPay** est une application ivoirienne de compte de paiement. Le client a un
compte SwimPay, qu'il recharge depuis ses comptes Mobile Money (Orange, MTN, Moov,
Wave) et bancaires, et depuis lequel il paie et envoie. **Les fonds sont détenus
par un partenaire émetteur de monnaie électronique (EME) agréé**, sur un compte
dédié adossé à 100 %. SwimPay ne prête pas son propre argent.

Plafonds de monnaie électronique dans l'UEMOA `[V]` : 2 000 000 F de solde pour un
porteur identifié, 10 000 000 F de recharges par mois.

**La tontine** : chaque membre verse la même somme à chaque tour, et à chaque tour
un ou plusieurs membres touchent la cagnotte. Son défaut majeur : **celui qui
touche tôt peut disparaître avec l'argent des autres.**

---

## 2. Les principes, et le choix assumé

1. **Aucun humain ne décide.** Ni le fondateur, ni un employé, ni l'organisateur.
   Chaque situation a une règle écrite d'avance, appliquée par le code.
2. **La même règle pour tout le monde.** Pas de niveaux, pas de statut.
3. **Rien ne bloque la tontine.** Une fraude n'arrête pas le système : elle est
   rendue sans intérêt.
4. **Deux modes d'entrée, mêmes règles** : *global* (entre inconnus) et *par
   invitation* (entre proches).
5. **SwimPay ne porte jamais un risque qui peut le mettre en faillite.**

**Le choix assumé par le fondateur.** La tontine SwimPay est **une épargne
collective où personne ne peut partir avec l'argent des autres**. Ce n'est pas un
crédit. Pour y arriver, chaque membre dépose une caution qui reste gelée jusqu'à la
fin. **Pendant la tontine, chaque membre a donc moins d'argent disponible que dans
une tontine de quartier** (§11.3). C'est le prix de la sécurité. Le fondateur le
maintient malgré la critique : la force du produit est qu'**aucun membre ne peut
fuir avec l'argent**, ce qu'aucune tontine de quartier ne garantit.

---

## 3. Les formats permis

N membres, T tours, B gagnants par tour, c la cotisation par tour.

- **N = B × T** : chaque membre gagne exactement une fois.
- **B ∈ {1, 2, 3}**, le plus petit qui tient dans le nombre de tours maximum.
- **N ≤ 30.**
- Cagnotte brute d'un gagnant = **T × c**, soit exactement ce qu'il cotise au total.

| Rythme | Un tour par | Tours | Cotisation | Délai de grâce `[H]` |
|---|---|---|---|---|
| Rapide | jour | 3 à 7 | 1 000 à 25 000 F | 12 heures |
| Hebdomadaire | semaine | 3 à 8 | 5 000 à 100 000 F | 48 heures |
| Mensuel | mois | 3 à 12 | 10 000 à 200 000 F | 5 jours |

Ces règles donnent **48 formats**. **Un format dont la cagnotte peut dépasser
2 000 000 F n'est ouvert qu'aux membres ayant relié un compte bancaire vérifié à
leur nom** (règle 17, §8).

---

## 4. Le déroulé

1. **Création.** Un membre choisit un format, un montant, un mode. Il n'a ensuite
   **aucun pouvoir** sur l'argent, l'ordre ou les règles.
2. **Recrutement.** Si le groupe n'est pas complet dans le délai, la tontine est
   annulée et tout est rendu.
3. **Entrée de chaque membre** :
   - pièce d'identité et photo du visage en direct, comparée à la pièce ; **une
     pièce = une personne = une place** ;
   - **caution de 30 % de la cagnotte** et **première cotisation**, bloquées tout de
     suite ;
   - l'écran affiche **ses propres chiffres** : ce qu'il paiera à chaque échéance, ce
     qu'il pourra retirer le jour du gain selon sa place, ce qu'il récupérera à la
     fin, les frais, ce qui se passe s'il paie en retard ou pas du tout ;
   - signature du **contrat** par code secret, qui inclut **l'autorisation de
     prélèvement** du §6.6.
   Il peut partir **avant le tirage** : tout lui est rendu.
4. **Tirage** (§7). L'ordre est fixé une fois pour toutes. **Le tour de chaque
   membre arrive toujours**, même s'il a cessé de payer.
5. **Les tours.** À chaque échéance, chaque cotisation est prélevée
   automatiquement, selon l'ordre du §6.3. Les gagnants du tour touchent leur
   cagnotte selon le §6.2.
6. **Clôture** (§6.7).

---

## 5. Définitions

| Terme | Définition exacte |
|---|---|
| **Cagnotte brute** | T × c |
| **Cagnotte nette** | Cagnotte brute − frais (3 %) − mise en réserve (2 %) |
| **Part libre** | Ce que le gagnant peut retirer le jour du gain |
| **Part bloquée** | Cagnotte nette − part libre. Elle reste dans la tontine et paie ses cotisations suivantes |
| **Échéance manquée** | Une cotisation que le membre n'a pas payée de sa poche à la fin du délai de grâce, et que sa part bloquée ne couvre pas |
| **Défaillant** | Un membre qui a au moins une échéance manquée non remboursée |
| **Fidèle** | Un membre qui n'a jamais eu d'échéance manquée |
| **Tort causé** | Ce que la réserve et SwimPay ont payé à la place d'un défaillant, plus ses pénalités |

---

## 6. Les règles d'argent

### 6.1 La caution

- **30 % de la cagnotte brute** (le fondateur hésite entre 25 % et 30 % ; les deux
  passent tous les scénarios, §11).
- Versée à l'entrée, **gelée jusqu'à la clôture**, quel que soit le rang de tirage.
- Elle ne sert qu'à **payer les échéances manquées** de son propriétaire, et leurs
  pénalités.
- **À la clôture, elle est rendue, moins le tort causé et rien d'autre** (§6.5).
  Elle n'est jamais distribuée aux autres membres.

### 6.2 Le jour du gain : la cagnotte paie d'abord toutes les mises restantes

> **La cagnotte du gagnant garde de côté toutes les mises qu'il doit encore. Le
> système les prélève dessus, à chaque échéance. Le gagnant récupère le reste.**
>
> Part récupérée = cagnotte nette − (tours restants × cotisation).

Décision de LO du 29/09/2026, après la démo : la version 2 laissait retirer « ce
qu'on a versé + 5 % », si bien que la part mise de côté ne couvrait jamais toutes
les mises restantes (il manquait environ 10 % de la cagnotte). Désormais, **après son
gain, un membre n'a plus rien à payer.**

Exemple de référence : 10 membres, 10 tours, 10 000 F par tour, cagnotte brute
100 000 F, cagnotte nette 95 000 F.

| Gagnant du tour | A versé | Récupère | Gardé pour ses mises restantes |
|---|---|---|---|
| 1 | 10 000 | 5 000 | 90 000 |
| 5 | 50 000 | 45 000 | 50 000 |
| 10 | 100 000 | 95 000 | 0 |

Conséquence : **plus personne n'a jamais en main l'argent des autres.** Chaque
gagnant récupère ce qu'il a versé, moins les frais (3 %) et la mise en réserve
(2 %, rendue à la fin). La tontine SwimPay est une épargne où l'on est certain
d'être payé, pas un crédit.

La part récupérée arrive sur le **compte SwimPay** du membre ; de là, il l'envoie
où il veut. Seules les règles de sécurité des retraits s'appliquent (§9).

Cas limite : si la cagnotte nette est inférieure aux mises restantes (tontines très
longues, gagnant du premier tour), tout est gardé et le complément est prélevé sur
son solde, comme une échéance normale.

### 6.3 L'ordre de paiement d'une cotisation, à chaque échéance

1. **La part gardée de sa cagnotte, toujours en premier**, jusqu'à épuisement ;
2. puis **son solde tontine**, qu'il alimente quand il veut (bouton « Ajouter du
   crédit ») ;
3. puis **son compte SwimPay**, prélevé automatiquement ;
4. si cela ne suffit pas à la fin du délai de grâce, c'est une **échéance
   manquée**, couverte dans l'ordre par :
   1. **sa caution**,
   2. **la réserve de secours**,
   3. **une avance de SwimPay**, plafonnée à 2 % de la collecte totale de la
      tontine ;
5. si tout cela ne suffit pas, **la part manquante de la cagnotte du tour est
   différée** : le gagnant la reçoit à la clôture, payée par les parts bloquées des
   défaillants (§6.7). Le gagnant ne perd rien, il attend.

Chaque franc couvert au point 4 coûte au défaillant **une pénalité de 5 %**, prise
en même temps que la couverture, et versée à la réserve.

### 6.4 Le retardataire qui revient

Dès que de l'argent arrive sur son compte, il rembourse automatiquement, dans
l'ordre : **l'avance de SwimPay**, puis **la réserve**, puis **il reconstitue sa
caution**. Ensuite il paie normalement. Les pénalités déjà prises restent dues. Un
retard ne l'exclut pas, et **son tour arrive à sa place, comme prévu**.

### 6.5 Celui qui cesse de payer : la saisie limitée au tort

La tontine ne cherche pas pourquoi il ne paie plus (fuite, perte de revenus,
maladie, décès : même règle). À la clôture :

1. **sa part bloquée** rembourse d'abord SwimPay, puis la réserve ;
2. **sa caution** rembourse ce qui reste dû ;
3. **ce qui reste de sa part bloquée et de sa caution lui est rendu**.

Il ne perd donc que le tort causé et ses pénalités. **S'il n'a pas encore gagné**,
son tour arrive quand même à sa place : sa cagnotte est alors **entièrement
bloquée**, elle rembourse ce qui a été payé pour lui, et le reste lui est rendu à la
clôture.

**Pourquoi la fuite n'existe plus** : après son gain, un membre n'a plus aucune mise
à payer, puisque sa cagnotte les paie toutes. Et le jour du gain, il ne récupère que
ce qu'il a lui-même versé, moins les frais. **Il n'y a rien à voler.** Le seul cas
de défaut restant est celui du membre qui cesse de payer **avant** son tour ; sa
caution, puis sa propre cagnotte à son tour, couvrent tout (§11).

### 6.6 La dette après la clôture

Si sa caution et sa part bloquée ne suffisent pas à rembourser le tort (cas très
rare, §11), le reste est une **dette**. Le contrat contient une **autorisation de
prélèvement**, signée par code secret, qui permet de la rembourser sur les entrées
futures de son compte SwimPay. Sa validité et sa forme sont **à confirmer avec le
partenaire EME** `[H]`. Sans cette autorisation, la dette passe au recouvrement
ordinaire.

### 6.7 La clôture

Dans l'ordre :

1. les parts bloquées et les cautions des défaillants remboursent SwimPay et la
   réserve (§6.5) ;
2. les **parts différées** sont versées aux gagnants concernés ;
3. le **bonus des derniers** est versé : **3 % de la cagnotte brute à chaque
   gagnant du dernier tiers des tours** (tours 8, 9, 10 sur l'exemple), payé par la
   réserve restante, donc par le groupe ;
4. ce qui reste de la réserve (pénalités comprises) est **partagé à parts égales
   entre les fidèles** ;
5. les cautions sont rendues (moins le tort, pour les défaillants).

### 6.8 Les frais du système

- **3 % de la cagnotte brute, prélevés au gain.** C'est le seul revenu de SwimPay
  sur la tontine : SwimPay ne gagne ni sur les cautions, ni sur la réserve, ni sur
  les pénalités.
- Ils paient ce qui distingue le produit : **personne ne peut partir avec
  l'argent**. Repère : le collecteur de tontine ivoirien garde environ une mise par
  mois, soit ~3 %, sans cette garantie `[H]`.
- Money Fellows (Égypte) facture jusqu'à 16 % aux premières places, 0 % au milieu,
  et rembourse une partie aux 3 dernières `[V]`. Mais il **avance** la cagnotte au
  premier ; SwimPay non. D'où un taux unique, plus bas.

---

## 7. Le tirage

- SwimPay publie d'abord **l'empreinte** de son propre nombre au hasard.
- Chaque membre connecté ajoute son **geste** (une contribution au hasard).
- Le résultat combine tout, s'affiche en direct, et il est **définitif** ; chacun
  peut refaire le calcul et le vérifier.
- Interrompu, il reprend avec la même empreinte, sans possibilité de changer le
  résultat.
- **Pur hasard, dans les deux modes.** Aucune place choisie ni négociée.

---

## 8. Chaque situation a sa règle

| # | Situation | La règle |
|---|---|---|
| 1 | Le groupe ne se remplit pas | Annulation, tout est rendu |
| 2 | Un membre part avant le tirage | Tout lui est rendu |
| 3 | Un membre veut partir après le tirage | Impossible. S'il cesse de payer, c'est la règle 5 |
| 4 | Retard de paiement, rattrapé ensuite | §6.3 et §6.4 : couverture, pénalité de 5 %, remboursement automatique au retour. Son tour arrive comme prévu |
| 5 | Il cesse de payer, **quelle qu'en soit la cause** | §6.5 : saisie limitée au tort, le reste lui est rendu à la clôture |
| 6 | Il cesse de payer **avant** son tour | Son tour arrive quand même ; sa cagnotte est entièrement bloquée, elle rembourse ce qui a été payé pour lui, le reste lui est rendu à la clôture |
| 7 | **Décès** | Règle 5. Ce qui lui revient (part bloquée, caution moins le tort, part de réserve s'il était fidèle) est versé **sur son compte SwimPay**, et la succession se règle au niveau du compte, selon la loi, hors de la tontine. La tontine ne demande aucun certificat |
| 8 | « J'ai payé » | Le journal de la tontine, visible par tous, fait foi. Aucune capture d'écran n'est une preuve |
| 9 | « Le tirage est truqué » | Chacun le vérifie dans l'application |
| 10 | « Je n'avais pas compris » | Le contrat, signé après l'affichage de ses propres chiffres, fait foi |
| 11 | Panne de SwimPay ou d'un opérateur à l'échéance | La tontine est suspendue, l'horloge s'arrête, personne n'est en retard. Au-delà de 7 jours de suspension `[H]` : liquidation (règle 20) |
| 12 | Erreur prouvée de SwimPay | Compensation automatique par une réserve d'incidents de SwimPay |
| 13 | Écart entre le registre et le solde réel chez le partenaire | Faute de SwimPay par définition : la réserve d'incidents comble l'écart, la tontine continue ; au-delà, suspension |
| 14 | Cotisation payée en double | La seconde est rendue automatiquement |
| 15 | Un versement échoue en route | Jamais relancé à l'aveugle : on vérifie ce qui est parti, puis on complète. Un versement ne part qu'une fois |
| 16 | Recharge par carte bancaire annulée après coup | L'argent rechargé par carte n'entre dans une tontine qu'après un délai de sécurité `[H]` |
| 17 | **Cagnotte au-delà du plafond de 2 000 000 F** | Formats ouverts seulement avec un compte bancaire vérifié au nom du membre (§3). Si ce compte est fermé au moment du gain, **le surplus reste dans la tontine, à son nom**, chez le partenaire EME, jusqu'à ce qu'il relie un nouveau compte bancaire à son nom `[H]`. Rien n'est débité en plus aux autres : l'argent n'a jamais quitté le compte du partenaire |
| 18 | Une autorité gèle un membre, ou son **identité est reconnue usurpée** | Pour la tontine, ses échéances non payées suivent la règle 5. **La personne dont l'identité a été volée n'est jamais débitrice** : la dette reste attachée au compte frauduleux. Si le contrôle d'identité de SwimPay a échoué, la perte est une erreur de SwimPay (règle 12). La reconnaissance de l'usurpation vient d'une autorité ou d'une décision de justice, hors de la tontine |
| 19 | **Comptes liés** dans la même tontine | Voir le §10 : critères précis, appliqués par le code. Depuis la version 2.1, personne n'a jamais en main l'argent des autres : les liens servent à la surveillance, pas au calcul. Rien n'est bloqué |
| 20 | **Liquidation** : suspension de plus de 7 jours, ou une part différée qui ne pourrait pas être payée à la clôture | La tontine s'arrête. Chaque membre reçoit **ce qu'il a versé moins ce qu'il a reçu**, les fidèles d'abord, les défaillants ensuite, sur l'argent de la tontine (parts bloquées, cautions, réserve). Les frais déjà pris sur des tours non terminés sont rendus |

---

## 9. La protection contre les escrocs et les pirates

**Contre les escrocs** :

- une tontine SwimPay **n'existe que dans l'application** ; on ne paie jamais
  ailleurs, et l'application le dit ;
- chaque retrait de la tontine demande **le code ou l'empreinte, sur l'appareil
  habituel, avec une confirmation reçue par un canal extérieur** ;
- **nouvel appareil, carte SIM changée ou nouveau compte de retrait : 72 heures
  d'attente** pour l'argent de la tontine, avec alerte sur l'ancien appareil ;
- l'argent de la tontine **ne sort que vers un compte au nom du membre**, vérifié
  par le nom que renvoie l'opérateur ou la banque ;
- SwimPay **n'envoie jamais de lien par SMS et n'appelle jamais pour demander un
  code** ;
- **aucun employé ne peut déplacer l'argent** ni changer un ordre ou un montant.

**Contre les pirates** :

- chaque opération d'argent est **signée par une clé qui ne quitte jamais la puce
  de sécurité du téléphone** ;
- l'application vérifie qu'elle est l'originale ; les écrans de code ne peuvent pas
  être filmés ;
- une demande rejouée est refusée ;
- un « paiement reçu » d'un partenaire n'est cru qu'après vérification de sa
  signature et confirmation auprès du partenaire ;
- le registre de l'argent est **en ajout seul et chaîné**, rapproché chaque jour du
  solde réel chez le partenaire ;
- données chiffrées, pièces d'identité chiffrées à part.

**Contre le blanchiment** : l'argent qui entre (recharges) passe le contrôle
anti-blanchiment du partenaire EME. La caution d'un défaillant **n'est jamais
redistribuée** (§6.1) : la tontine ne peut pas servir à faire passer de l'argent
d'un membre à un autre. Seules les pénalités (5 % de ce qui est couvert) vont à la
réserve, partagée à parts égales entre tous les fidèles ; un réseau ne peut pas les
diriger vers un compte choisi.

---

## 10. Les comptes liés : les critères exacts

Deux comptes d'une même tontine sont **liés** si au moins un de ces faits est
enregistré par le système :

1. **le même appareil** (la même clé matérielle) a servi aux deux comptes ;
2. **la même source de recharge** (le même numéro Mobile Money ou le même compte
   bancaire) a rechargé les deux comptes ;
3. **le même compte de retrait** est relié aux deux ;
4. **de l'argent a circulé entre eux** dans les 30 jours avant l'entrée `[H]`.

Les liens se propagent : si A est lié à B et B à C, les trois forment un groupe.

**Effet** : depuis la version 2.1 (§6.2), aucun membre n'a jamais en main l'argent des
autres, liés ou non ; un groupe de comptes liés ne peut donc rien extraire. Les liens
sont enregistrés et servent à la surveillance (répétition du même schéma d'une
tontine à l'autre). Aucun humain ne décide, rien n'est bloqué.

---

## 11. Ce qui a été simulé

Script : `design/pivot/sondes/tontine-v2.py`, qui applique **toutes** les règles du
§6. Exemple de référence (10 membres, 10 tours, 10 000 F), caution de 30 %.
Résultat = ce que chacun a reçu moins ce qu'il a versé, à la fin.

### 11.1 Du scénario joyeux au pire

| Scénario | Fidèles | Défaillants | SwimPay |
|---|---|---|---|
| A. Tout le monde paie | −3 900 F ; les 3 derniers −900 F | — | +30 000 F, aucune avance |
| B. Un membre manque 2 échéances puis revient | −3 667 F environ | −6 000 F | +30 000 F, aucune avance |
| C. Un membre pas encore gagnant abandonne au tour 4 | −3 556 F environ | −7 000 F | +30 000 F, aucune avance |
| D. Le gagnant du tour 1 cesse de payer | **−3 900 F, comme si de rien n'était** | aucun : sa cagnotte a déjà tout payé | +30 000 F, aucune avance |
| E. Les 3 premiers gagnants cessent de payer | idem | aucun | idem |
| F. Les 5 premiers gagnants cessent de payer au tour 6 | idem | aucun | idem |
| G. Les 9 premiers cessent de payer après leur gain | idem | aucun | idem |
| H. Tous sauf le dernier abandonnent dès le tour 2 | le dernier : +9 750 F | −2 000 F à −8 000 F | +30 000 F, avance de 20 000 F au plus, remboursée, **perte 0** |

Résultat = ce que chacun a reçu moins ce qu'il a versé, à la fin ; le −3 900 F d'un
fidèle, ce sont les frais du système (3 000 F) et sa part du bonus des derniers
(900 F). À 25 % de caution, les résultats sont les mêmes, sauf l'avance de SwimPay
dans le cas C (3 500 F, remboursée).

### 11.2 Ce qu'il faut en retenir

- **La tontine ne s'effondre jamais** : chaque cagnotte est financée, même si 9
  membres sur 10 abandonnent.
- **SwimPay ne perd jamais rien.** Il peut avancer de l'argent au pire (cas H), dans
  son plafond de 2 %, et il est remboursé à la clôture.
- **Un gagnant ne peut plus fuir** : il n'a plus rien à payer (cas D à G).
- **Le seul défaillant possible** est celui qui arrête avant son tour ; il finit
  plus bas qu'un fidèle (−7 000 F contre −3 556 F, cas C).

### 11.3 Ce que chaque membre a en main pendant la tontine

Il a versé sa caution (30 000 F) et ses cotisations ; le jour du gain, il récupère
ses cotisations moins les frais et la réserve. **La caution lui revient à la
clôture.** Il n'a jamais d'argent des autres en main. C'est le choix assumé du §2.

### 11.4 Le catalogue

La version 2 prouvait que, même sans caution, une avance de 5 % restait sûre sur
les 48 formats (`tontine-retrait.py`). La version 2.1 supprime l'avance : le risque
d'un gagnant qui fuit disparaît par construction, dans tous les formats.

---

## 12. Réponses aux relectures de la version 1

### Gemini

| # | Question soulevée | Réponse |
|---|---|---|
| G1 | **Blanchiment** : des mules font défaut, leurs cautions saisies vont au compte « propre » | Corrigé et fermé. La caution n'est **plus jamais redistribuée** : on n'en prend que le tort, le reste revient au défaillant (§6.5). Seules les pénalités vont à la réserve, partagée à parts égales entre tous les fidèles, sans destinataire choisi. Et l'argent entrant passe le contrôle anti-blanchiment du partenaire (§9) |
| G2 | **Plafond de 2 M sans banque** : l'argent reste « dans les limbes » | Règle 17 : ces formats exigent une banque vérifiée dès l'entrée ; si elle est fermée au gain, le surplus reste à son nom dans la tontine, chez le partenaire. Les autres ne sont pas débités : l'argent n'a jamais quitté le compte du partenaire |
| G3 | **Le premier gagnant a moins d'argent qu'avant** (−30 000 F en v1) | **Exact, et assumé.** Il a versé sa caution, rendue à la clôture, et ne récupère au gain que ses cotisations moins les frais (§6.2, §11.3). C'est le choix du fondateur (§2) : la sécurité est la raison d'être du produit |
| G4 | **Incitation perverse** : les honnêtes gagnent à la défaillance des autres | Corrigé. Sans redistribution des cautions, le gain des fidèles se limite aux pénalités (cas E : quelques centaines de francs) |
| G5 | **Le retardataire de bonne foi** perd-il sa caution ? | Non. Règles §6.3 et §6.4 : après le délai de grâce, seule la cotisation manquante (et 5 % de pénalité) est prise sur la caution ; dès que de l'argent arrive, la caution est reconstituée ; son tour arrive comme prévu. Cas B simulé : il finit à −6 000 F, contre −3 667 F pour les autres |
| G6 | **Identité usurpée découverte en cours de route** : qui paie le tour ? | Règle 18 : le tour est payé par la couverture habituelle (§6.3), la victime de l'usurpation n'est jamais débitrice, et si le contrôle d'identité de SwimPay a échoué, c'est une erreur de SwimPay, compensée (règle 12) |
| G7 | **Supprimer la caution**, ou la remplacer par des garants | La caution est **maintenue** par le fondateur (§2), ramenée à 30 %. Les garants tiers sont écartés en première version : il faudrait prouver leur consentement et leur solvabilité, et ils ouvrent une nouvelle collusion (le garant complice). À étudier plus tard |
| G8 | **Produit invendable** face à la tontine de quartier gratuite | Le produit ne vise pas à battre la tontine de quartier sur la liquidité, mais sur **la certitude d'être payé**. Coût pour un fidèle : 3 900 F sur 100 000 F. À valider par un test de marché ; c'est la vraie question ouverte |
| G9 | **Clause pénale excessive** (droit OHADA) | Corrigé : la saisie est limitée au tort causé ; la seule pénalité est de 5 % des sommes couvertes à sa place, fixée d'avance dans le contrat. Proportionnalité à confirmer par un juriste `[H]` |
| G10 | **Prélever sur les fonds futurs** sans mandat | Corrigé : le contrat contient une **autorisation de prélèvement** explicite, signée par code (§6.6). Sa validité est à confirmer avec le partenaire EME `[H]` |

### DeepSeek

| # | Question soulevée | Réponse |
|---|---|---|
| D1 | **Ordre de consommation** de la part bloquée non précisé | Précisé au §6.3 : **la part bloquée paie toujours en premier**, puis le compte du membre, puis caution, réserve, avance de SwimPay |
| D2 | Le calcul du pire cas « 48 sur 48 » est-il juste ? | Oui pour la version 2 (§11.4). La version 2.1 supprime l'avance : la question ne se pose plus |
| D3 | **Abandon avant son tour** : sa caution est saisie et son tour annulé ? | Non. Son tour **n'est jamais annulé** : l'ordre est fixé au tirage. Sa cagnotte, à son tour, est entièrement bloquée, rembourse ce qui a été payé pour lui, et le reste lui est rendu (règle 6) |
| D4 | Le gagnant du tour 5 qui fuit perd 75 000 F ? | Non. Depuis la version 2.1, sa cagnotte a déjà payé toutes ses mises : il n'a plus rien à payer, donc rien à fuir (cas F) |
| D5 | **Si 5 membres fuient, la tontine meurt** | Non. Simulé (cas F, et même 9 fuites, cas G) : les parts bloquées et les cautions des défaillants continuent de payer leurs cotisations ; **chaque cagnotte est financée** |
| D6 | **Tous fuient sauf le dernier** : que reçoit-il ? | **Sa cagnotte entière**, plus la réserve (cas G : +13 500 F). Si l'argent manquait au moment de son tour, la part manquante lui serait versée à la clôture (§6.3, point 4) |
| D7 | Il faut une **règle de liquidation** | Ajoutée (règle 20), pour les seuls cas où la tontine ne peut vraiment plus tourner : suspension de plus de 7 jours, ou part différée impayable. Elle ne s'est déclenchée dans aucun scénario simulé |
| D8 | **Caution progressive, garant, nantissement** | Caution d'entrée maintenue (§2). « Progressive » (prise sur la future cagnotte) : c'est déjà le rôle de la part bloquée. Nantissement sur un bien : impossible à gérer sans humain, écarté. Garant : voir G7 |
| D9 | **Avance variable selon la place** | Écartée en version 2.1 : il n'y a plus d'avance. Chacun récupère ce qu'il a versé, moins les frais (§6.2) |
| D10 | Le **bonus des derniers**, payé par le groupe, pénalise deux fois les premiers | Le fondateur maintient qu'il est payé par le groupe : c'est un rééquilibrage entre membres (les derniers ont attendu), pas un service de SwimPay. Coût : 900 F par membre sur l'exemple |
| D11 | **Frais de 3 %** : la comparaison avec Money Fellows boite | D'accord : Money Fellows avance la cagnotte, pas SwimPay. Les 3 % paient la garantie que personne ne part avec l'argent (§6.8) |
| D12 | **Comptes liés** : règle inapplicable, qui décide ? | Critères exacts au §10, appliqués par le code, sans humain. Sans avance (v2.1), ils ne peuvent rien extraire ; les liens servent à la surveillance |
| D13 | **Décès** : la part bloquée et la caution sont-elles saisies ? | Règle 7 : on ne prend que le tort causé ; tout le reste est versé sur son compte, pour sa succession |
| D14 | **Qualification juridique** (collecte d'épargne, service de paiement, assurance) | **C'est la question n°1, d'accord.** Elle est posée au partenaire EME et à un avocat avant tout lancement. Pistes : que le partenaire agréé porte l'activité, SwimPay n'étant que l'opérateur technique ; ou un partenariat avec un établissement de microfinance `[H]` |
| D15 | **Saisie totale de la caution** | Corrigé (G9) |
| D16 | **Dette qui suit** sans clause | Corrigé (G10) |

---

## 13. Ce qui reste ouvert

1. **La qualification juridique** de l'activité (D14). Bloquant avant lancement.
2. **L'autorisation de prélèvement** et la proportionnalité de la pénalité de 5 %,
   à valider par un juriste et le partenaire EME.
3. **L'attractivité** (G8) : la sécurité vaut-elle 30 000 F de caution jusqu'à la fin et 3 900 F de
   coût, pour les clients visés ? Seul un test de marché répondra.
4. **Caution 25 % ou 30 %** : les deux passent tous les scénarios.
5. Les délais de grâce et de suspension `[H]`.
6. La SIM dupliquée n'est détectable que si l'opérateur fournit l'information `[H]`.
7. La contrainte physique (quelqu'un forcé de retirer avec son propre téléphone)
   n'est pas couverte.

---

## 14. Ce qu'on demande aux relecteurs

1. **Y a-t-il encore un moyen de voler** un membre, le groupe ou SwimPay ? Scénario
   pas à pas, avec des chiffres.
2. **Une situation n'a-t-elle pas de règle**, et demanderait un humain ?
3. **Une règle se contredit-elle** avec une autre ?
4. Une réponse du §12 vous paraît-elle fausse ? Laquelle, et pourquoi ?

Merci de distinguer ce qui est **bloquant** de ce qui est un **détail**, et de
vérifier vos calculs avec les définitions du §5.
