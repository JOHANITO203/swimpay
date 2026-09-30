# La tontine classique SwimPay — spécification complète, version 2

> Document autonome, pour relecture par d'autres IA. **Version 3 (30/09/2026)** :
> une règle de retrait unique, qui s'adapte au risque de chaque membre (§6.2).
> **Version 2**,
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

### 6.2 Le jour du gain : on ne garde que ce qu'il doit encore

> **Le jour du gain, SwimPay garde exactement les mises qui restent à payer au
> gagnant, prises d'abord sur sa caution, puis sur sa cagnotte si la caution ne
> suffit pas. Tout le reste lui est rendu, tout de suite.**
>
> **Ensuite, à chaque mise qu'il paie, il doit moins : ce qui est gardé baisse
> d'autant, et la différence lui est rendue.**

En formule, après le tour t, pour un membre gagnant :

    gardé  =  (T − t) × c                      ses mises restantes, ni plus ni moins
    dont   caution gardée   = min(caution restante, gardé)
           cagnotte gardée  = gardé − caution gardée
    rendu  =  tout le reste (cagnotte nette, et caution au-delà de ce qu'il doit)

Le jour du gain, cela donne : **rendu = cagnotte nette + caution − mises
restantes**.

Exemple de référence : 10 membres, 10 tours, 10 000 F, cagnotte nette 95 000 F,
caution 30 000 F.

| Gagnant du tour | A versé (caution comprise) | Récupère le jour du gain | Gardé | Position le jour du gain |
|---|---|---|---|---|
| 1 | 40 000 | 35 000 | 90 000 (caution + 60 000 de cagnotte) | −5 000 |
| 3 | 60 000 | 55 000 | 70 000 (caution + 40 000) | −5 000 |
| 5 | 80 000 | 75 000 | 50 000 (caution + 20 000) | −5 000 |
| 7 | 100 000 | 95 000 | 30 000 (la caution seule) | −5 000 |
| 10 | 130 000 | 125 000 (la caution est rendue) | 0 | −5 000 |

Le gagnant du tour 3 récupère 55 000 F, puis 10 000 F à chacune de ses 7 mises
payées (d'abord de sa cagnotte, puis de sa caution), jusqu'à tout avoir récupéré.

**Les trois propriétés, mesurées (§11)** :

1. **Juste** : le jour de son gain, chaque membre, **à n'importe quelle place**, se
   retrouve exactement à −5 % de la cagnotte (frais 3 % et réserve 2 %, la réserve
   étant rendue à la fin). La seule différence entre les places est le moment où
   l'on touche ; le dernier tiers reçoit un bonus de 3 % pour son attente.
2. **Adaptée à chaque membre** : le calcul ne regarde que ce qu'il doit encore et sa
   caution restante. Un membre dont la caution a servi à couvrir des retards non
   rattrapés a moins de caution : on garde davantage de sa cagnotte.
3. **Indépendante du nombre de membres** : N n'entre pas dans la formule. Avec 10,
   20 ou 30 membres, le gagnant du tour 1 d'une tontine de 10 tours récupère la même
   somme.

Historique : la version 2 laissait retirer « ce qu'on a versé + 5 % » ; la part
gardée ne couvrait alors jamais toutes les mises restantes. Une version
intermédiaire gardait toutes les mises sur la cagnotte ; LO l'a rejetée parce
qu'elle retirait l'intérêt d'être tiré tôt. La version 3 compte la caution dans ce
qui est gardé : on rend beaucoup plus, et le risque reste nul.

Ce qui est rendu arrive sur le **compte SwimPay** du membre ; de là, il l'envoie où
il veut. Les règles de sécurité des retraits s'appliquent (§9).

### 6.3 L'ordre de paiement d'une cotisation, à chaque échéance

1. **son solde tontine**, qu'il alimente quand il veut (bouton « Ajouter du
   crédit ») ;
2. puis **son compte SwimPay**, prélevé automatiquement ;
3. si cela ne suffit pas à la fin du délai de grâce, c'est une **échéance
   manquée**, couverte dans l'ordre par :
   1. **ce qui est gardé de sa cagnotte**, s'il a déjà gagné,
   2. **sa caution**,
   3. **la réserve de secours**,
   4. **une avance de SwimPay**, plafonnée à 2 % de la collecte totale de la
      tontine ;
4. si tout cela ne suffit pas, **la part manquante de la cagnotte du tour est
   différée** : le gagnant la reçoit à la clôture, payée par ce qui est gardé chez
   les défaillants (§6.7). Le gagnant ne perd rien, il attend.

Chaque franc couvert au point 3 coûte au défaillant **une pénalité de 5 %**, versée
à la réserve. **La pénalité ne se prend que sur son propre argent, et seulement sur
ce qui dépasse ses mises encore à venir** : elle ne passe jamais avant ce qu'il doit
au groupe, et personne ne l'avance pour lui.

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

**Pourquoi la fuite ne rapporte rien** : ce qui est gardé (caution comprise) couvre
toujours toutes ses mises restantes. S'il s'enfuit après son gain, ses mises sont
payées par ce qui est gardé, et il a récupéré moins que ce qu'il a versé. **Il n'y a
rien à voler.** Quand sa cagnotte arrive, elle rembourse **d'abord ses propres
dettes** envers le groupe ; et ce qu'on lui doit (une part différée) règle d'abord
ce qu'il doit encore.

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
| 19 | **Comptes liés** dans la même tontine | Voir le §10 : critères précis, appliqués par le code. Depuis la version 3, personne n'a jamais en main l'argent des autres : les liens servent à la surveillance, pas au calcul. Rien n'est bloqué |
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

**Effet** : depuis la version 3 (§6.2), aucun membre n'a jamais en main l'argent des
autres, liés ou non ; un groupe de comptes liés ne peut donc rien extraire. Les liens
sont enregistrés et servent à la surveillance (répétition du même schéma d'une
tontine à l'autre). Aucun humain ne décide, rien n'est bloqué.

---

## 11. Ce qui a été simulé

Scripts : `design/pivot/sondes/tontine-v3.py` (la règle de la version 3, et les
épreuves), repris à l'identique par le moteur de la démo (1 760 cas comparés, zéro
écart). Exemple de référence : 10 membres, 10 tours, 10 000 F, caution de 30 %.
Résultat = ce que chacun a reçu moins ce qu'il a versé, à la fin.

### 11.1 Du scénario joyeux au pire

| Scénario | Fidèles | Défaillants | SwimPay |
|---|---|---|---|
| A. Tout le monde paie | −3 900 F ; les 3 derniers −900 F | — | +30 000 F, aucune avance |
| B. Un membre manque 2 échéances puis revient | −3 778 F environ | −5 000 F | +30 000 F, aucune avance |
| C. Un membre pas encore gagnant abandonne au tour 4 | −3 611 F environ | −6 500 F | +30 000 F, aucune avance |
| D. Le gagnant du tour 1 cesse de payer | −3 778 F environ | −5 000 F | +30 000 F, aucune avance |
| E. Les 3 premiers gagnants cessent de payer | −3 429 F environ | −5 000 F chacun | +30 000 F, aucune avance |
| F. Les 5 premiers gagnants cessent de payer au tour 6 | de −2 800 à +200 F | −5 000 F chacun | +30 000 F, aucune avance |
| G. Les 9 premiers cessent de payer après leur gain | le dernier : +9 000 F | −5 000 F à −2 000 F | +30 000 F, aucune avance |
| H. Tous sauf le dernier abandonnent dès le tour 2 | le dernier : +27 000 F | −2 500 F à −9 000 F | +30 000 F, avance de 20 000 F au plus, remboursée, **perte 0** |

Le −3 900 F d'un fidèle, ce sont les frais du système (3 000 F) et sa part du bonus
des derniers (900 F). Un fidèle ne finit jamais plus bas que dans le cas A ; ce qu'il
gagne en plus vient des pénalités des défaillants.

### 11.2 Les épreuves

| Épreuve | Résultat |
|---|---|
| 260 cas types : les formats de 2 à 30 membres, de 2 à 30 tours, 1 à 3 gagnants par tour, sous 5 scénarios de défaut (dont « tous les gagnants fuient » et « presque tous abandonnent au tour 2 ») | perte de SwimPay **0** ; honnêtes lésés **0** ; fuites qui rapportent **0** |
| 5 000 tontines tirées au hasard : cotisations de 500 à 100 000 F, 35 % des membres en retard ou en abandon, avec ou sans retour | perte de SwimPay **0** ; honnêtes lésés **0** ; fuites qui rapportent **0**, hors 17 cas où **tous** les membres font défaut, sans honnête à léser |
| Argent des autres qu'un membre a eu en main, au plus | **0 F** |

Deux défauts anciens, présents aussi en version 2, ont été trouvés par ces épreuves
et corrigés : une part différée versée à un membre qui devait encore au groupe, et
des pénalités prises sur l'argent qui devait payer les mises à venir.

### 11.3 Ce que chaque membre a en main pendant la tontine

Avant son gain : il a versé sa caution et ses mises. Le jour de son gain : il a
récupéré tout ce qu'il a mis, caution comprise, **moins 5 %**. Ensuite, chaque mise
payée lui est rendue, jusqu'à ce qu'il ne doive plus rien. Il n'a jamais d'argent
des autres en main.

### 11.4 Le catalogue

La règle de la version 3 ne dépend ni du nombre de membres, ni du nombre de tours :
les épreuves du §11.2 couvrent tous les formats permis.

---

## 12. Réponses aux relectures de la version 1

### Gemini

| # | Question soulevée | Réponse |
|---|---|---|
| G1 | **Blanchiment** : des mules font défaut, leurs cautions saisies vont au compte « propre » | Corrigé et fermé. La caution n'est **plus jamais redistribuée** : on n'en prend que le tort, le reste revient au défaillant (§6.5). Seules les pénalités vont à la réserve, partagée à parts égales entre tous les fidèles, sans destinataire choisi. Et l'argent entrant passe le contrôle anti-blanchiment du partenaire (§9) |
| G2 | **Plafond de 2 M sans banque** : l'argent reste « dans les limbes » | Règle 17 : ces formats exigent une banque vérifiée dès l'entrée ; si elle est fermée au gain, le surplus reste à son nom dans la tontine, chez le partenaire. Les autres ne sont pas débités : l'argent n'a jamais quitté le compte du partenaire |
| G3 | **Le premier gagnant a moins d'argent qu'avant** (−30 000 F en v1) | **Corrigé en version 3.** Le jour de son gain, il récupère tout ce qu'il a mis, caution comprise, moins 5 % : 35 000 F sur l'exemple, contre 15 000 F en version 2 (§6.2) |
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
| D2 | Le calcul du pire cas « 48 sur 48 » est-il juste ? | Oui pour la version 2. La version 3 est éprouvée sur tous les formats et 5 000 tontines au hasard (§11.2) |
| D3 | **Abandon avant son tour** : sa caution est saisie et son tour annulé ? | Non. Son tour **n'est jamais annulé** : l'ordre est fixé au tirage. Sa cagnotte, à son tour, est entièrement bloquée, rembourse ce qui a été payé pour lui, et le reste lui est rendu (règle 6) |
| D4 | Le gagnant du tour 5 qui fuit perd 75 000 F ? | Non : ce qui est gardé paie ses mises ; il finit à −5 000 F, contre −2 800 F environ pour les fidèles (cas F). Il ne peut rien emporter des autres |
| D5 | **Si 5 membres fuient, la tontine meurt** | Non. Simulé (cas F, et même 9 fuites, cas G) : les parts bloquées et les cautions des défaillants continuent de payer leurs cotisations ; **chaque cagnotte est financée** |
| D6 | **Tous fuient sauf le dernier** : que reçoit-il ? | **Sa cagnotte entière**, plus la réserve (cas G : +13 500 F). Si l'argent manquait au moment de son tour, la part manquante lui serait versée à la clôture (§6.3, point 4) |
| D7 | Il faut une **règle de liquidation** | Ajoutée (règle 20), pour les seuls cas où la tontine ne peut vraiment plus tourner : suspension de plus de 7 jours, ou part différée impayable. Elle ne s'est déclenchée dans aucun scénario simulé |
| D8 | **Caution progressive, garant, nantissement** | Caution d'entrée maintenue (§2). « Progressive » (prise sur la future cagnotte) : c'est déjà le rôle de la part bloquée. Nantissement sur un bien : impossible à gérer sans humain, écarté. Garant : voir G7 |
| D9 | **Avance variable selon la place** | Résolu autrement en version 3 : ce qui est rendu croît avec la place (35 000 F au tour 1, 125 000 F au tour 10), et chacun est à −5 % le jour de son gain (§6.2) |
| D10 | Le **bonus des derniers**, payé par le groupe, pénalise deux fois les premiers | Le fondateur maintient qu'il est payé par le groupe : c'est un rééquilibrage entre membres (les derniers ont attendu), pas un service de SwimPay. Coût : 900 F par membre sur l'exemple |
| D11 | **Frais de 3 %** : la comparaison avec Money Fellows boite | D'accord : Money Fellows avance la cagnotte, pas SwimPay. Les 3 % paient la garantie que personne ne part avec l'argent (§6.8) |
| D12 | **Comptes liés** : règle inapplicable, qui décide ? | Critères exacts au §10, appliqués par le code, sans humain. En version 3, personne n'a l'argent des autres en main : des comptes liés ne peuvent rien extraire ; les liens servent à la surveillance |
| D13 | **Décès** : la part bloquée et la caution sont-elles saisies ? | Règle 7 : on ne prend que le tort causé ; tout le reste est versé sur son compte, pour sa succession |
| D14 | **Qualification juridique** (collecte d'épargne, service de paiement, assurance) | **C'est la question n°1, d'accord.** Elle est posée au partenaire EME et à un avocat avant tout lancement. Pistes : que le partenaire agréé porte l'activité, SwimPay n'étant que l'opérateur technique ; ou un partenariat avec un établissement de microfinance `[H]` |
| D15 | **Saisie totale de la caution** | Corrigé (G9) |
| D16 | **Dette qui suit** sans clause | Corrigé (G10) |

---

## 13. Ce qui reste ouvert

1. **La qualification juridique** de l'activité (D14). Bloquant avant lancement.
2. **L'autorisation de prélèvement** et la proportionnalité de la pénalité de 5 %,
   à valider par un juriste et le partenaire EME.
3. **L'attractivité** (G8) : la sécurité vaut-elle une caution de 30 %, rendue au fil des mises après le gain, et 3 900 F de
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
