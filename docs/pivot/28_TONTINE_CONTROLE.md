# SwimPay Tontine — le contrôle de la fonctionnalité

> Écrit le 29 septembre 2026, après une consigne de LO qui corrige
> `27_TONTINE_ARCHITECTURE.md` sur un point de fond :
>
> *« Le système est censé fonctionner sans mon intervention ni une intervention
> humaine, il doit être purement déterministe. Peu importe le mode, rien ne doit
> empêcher le système de fonctionner. Les tontines par invitation sont une guerre de
> clan, donc sujettes à la fraude, mais malgré cela il faut poser un système
> impartial, juste, et qui combat la fraude. Chaque individu finit par recevoir ce
> qu'il cotise, sauf le premier qui bénéficie de la tontine et le dernier : les
> mécanismes doivent empêcher le premier de s'en aller et le dernier de se sentir
> lésé, en appliquant les mêmes règles à chaque utilisateur. La tontine est un
> système rotatif de prêt, on doit la traiter comme telle, en protégeant les
> prêteurs. Chaque pierre de l'édifice doit être maîtrisée, du point de vue du
> créateur, de l'utilisateur de bonne foi, de l'utilisateur de mauvaise foi, et de
> celui qui ne sait pas. Sinon SwimPay peut faire faillite et subir des
> poursuites. »*
>
> La facturation vient **après** ce document.

## 0. Décisions de LO, 29/09 au soir — elles priment sur la suite du document

| Sujet | Décision |
|---|---|
| **Niveaux entre membres** | **Supprimés.** Même règle pour tous. Les §3.1, §3.2 et le tableau des niveaux ci-dessous sont dépassés |
| **Ce que le gagnant récupère le jour du gain** | **Règle de la version 3 (LO, 30/09)** : SwimPay garde exactement ses mises restantes, caution d'abord, puis cagnotte ; tout le reste lui est rendu, sur son compte SwimPay. À chaque mise payée, on lui rend autant. Chacun est à −5 % de la cagnotte le jour de son gain, à toute place et pour toute taille de tontine (`tontine-v3.py`, `31` §6.2) |
| **Réserve de secours** | **2 % de chaque tour**, rendue à la clôture à ceux qui ont tout payé |
| **Preuve** | Pire cas (le tiers des premiers gagnants fuit), 48 formats : **SwimPay ne paie jamais rien**. À 10 % de bonus, 31 formats sur 48 seulement ; à 15 %, 8 |
| **Gel de l'argent retiré** | **Non.** L'intérêt de la tontine est de toucher une somme ; le geler la tue, et la protection n'en a pas besoin |
| **Sécurité des retraits** | Deux niveaux à chaque retrait de la tontine : code ou empreinte, et confirmation extérieure. Contre le vol du téléphone |
| **Le dernier** | Un bonus de 2 % à 5 % de sa cagnotte, **payé par le groupe** (et dit comme tel dans le Pacte), à la place du « loyer du temps » du §3.2. Montant et nombre de places concernées : à trancher |
| **Celui qui fuit** | Il perd son bloqué et sa part de réserve ; sa dette est remboursée par tout argent qui arrive ensuite sur son compte |
| **Caution** (LO, 29/09) | **35 % de la cagnotte, gelée tout l'événement**, rendue à la fin. Celui qui fuit la perd, elle revient aux membres honnêtes. Celui qui arrête **avant** d'avoir gagné : sa prise paie ses cotisations manquées, le reste lui est rendu à la fin (`tontine-scenarios-frais.py`) |
| **Bonus du dernier tiers** | **3 % de la cagnotte** à chaque gagnant du dernier tiers des tours, payé par le groupe. Validé |
| **Frais SwimPay** | **3 % de la cagnotte, prélevés au gain.** Présentés au client comme **les frais du système** : ce qui garantit que personne ne part avec l'argent. Repère : le collecteur de tontine garde environ une mise par mois, soit ~3 % `[H]`. Money Fellows (Égypte) facture l'argent reçu tôt (jusqu'à 16 %, 0 % au milieu, cashback aux 3 dernières places) ; non transposable ici, notre avance étant de 5 % seulement. Cas joyeux, exemple de LO : chaque membre −3 900 F, les 3 derniers −900 F, SwimPay +30 000 F par tontine. Validé par LO le 29/09 |
| **La limite connue** | Un gagnant tôt ne peut utiliser tout de suite que 5 % de l'argent des autres. C'est le prix de la sûreté : toute avance plus grosse est de l'argent que le groupe peut perdre |

---

## 1. Le principe : un système qui ne dépend de personne

**Le fonctionnement d'une tontine ne dépend d'aucun humain.** Ni de LO, ni d'un
employé, ni de l'organisateur. Chaque situation possible a sa règle, écrite
d'avance, appliquée par le code, **la même pour tout le monde**.

Une distinction rend cela possible :

| | **Le fonctionnement** | **Le recouvrement** |
|---|---|---|
| Ce que c'est | Collecter, bloquer, tirer, verser, protéger | Poursuivre un défaillant, après coup |
| Qui le fait | **Le code, seul** | Le service de SwimPay, ou un tiers |
| Peut-il bloquer la tontine ? | — | **Jamais** : le Filet a déjà payé, la tontine a continué |

Le recouvrement peut demander des humains (un huissier, un juge), mais il se passe
**hors du chemin** de la tontine. Aucun membre honnête n'attend jamais une décision
humaine.

**Ce que ça change dans `27`** :

- **M18 Litiges** n'a plus d'arbitre humain : chaque litige possible a sa règle (§5).
- **M2 Graphe des liens** ne bloque plus le tirage : il **mesure** le risque d'un
  clan et le **fait payer** automatiquement (§4).
- **M17 Événements de vie** ne dépend plus d'un certificat vérifié à la main (§5,
  ligne 8).
- **La réconciliation** qui trouve un écart ne gèle plus la tontine en attendant
  l'équipe (§5, ligne 21).

---

## 2. La tontine est une chaîne de prêts : on la mesure

Exemple de LO : 10 membres, 5 tours, 10 000 F par tour, 2 gagnants par tour, prise de
50 000 F. Position de chaque membre après chaque tour, sans protection (reçu moins
versé) :

| Tiré au tour | Position tour par tour | Il **emprunte** au groupe | Il **prête** au groupe | Net |
|---|---|---|---|---|
| 1 | +40 000, +30 000, +20 000, +10 000, 0 | **100 000** | 0 | emprunteur de 100 000 |
| 2 | −10 000, +30 000, +20 000, +10 000, 0 | 60 000 | 10 000 | emprunteur de 50 000 |
| 3 | −10 000, −20 000, +20 000, +10 000, 0 | 30 000 | 30 000 | **à l'équilibre** |
| 4 | −10 000, −20 000, −30 000, +10 000, 0 | 10 000 | 60 000 | prêteur de 50 000 |
| 5 | −10 000, −20 000, −30 000, −40 000, 0 | 0 | **100 000** | prêteur de 100 000 |

*L'unité est le « tour-franc » : un franc prêté pendant un tour. On mesure le montant
et la durée à la fois.*

Trois faits, qui fondent tout le reste :

1. **Le premier emprunte exactement ce que le dernier prête.** L'intuition de LO est
   exacte : la tontine est un prêt des derniers aux premiers.
2. **Le milieu ne gagne ni ne perd.**
3. **La somme des emprunts égale la somme des prêts.** L'argent ne se crée pas, il
   circule dans le temps.

---

## 3. Les deux mécanismes qui répondent à LO

### 3.1 Empêcher le premier de s'en aller : **la prise protégée**

Le premier est un emprunteur. On le traite comme tel : **il ne reçoit en avance que
ce que le système peut couvrir s'il disparaît.** C'est la retenue calculée
(module M12), éprouvée par le simulateur sur les 48 formats (`25` §4) :

- la **caution** et la **première cotisation**, bloquées à l'entrée ;
- la **retenue** sur sa prise, qui paie automatiquement ses cotisations restantes ;
- le **découvert** autorisé (ce qui reste à risque) dépend de son niveau, et ne
  dépasse jamais ce que le Filet peut payer.

Le même exemple, **avec** la prise protégée. Ce que le membre a en main de l'argent
des autres, en tours-francs (`design/pivot/sondes/tontine-pret.py`) :

| Tiré au tour | Sans protection (tontine de quartier) | **Nouveau** | **Confirmé** | **Très fiable** |
|---|---|---|---|---|
| 1 | 100 000 | **0** | 30 000 | 50 000 |
| 2 | 60 000 | 0 | 20 000 | 30 000 |
| 3 | 30 000 | 0 | 10 000 | 10 000 |
| 4 | 10 000 | 0 | 0 | 0 |
| 5 | 0 | 0 | 0 | 0 |

**Le premier n'emporte plus la cagnotte : il n'emporte que son découvert.** Au pire
10 000 F pour un membre confirmé, 20 000 F pour un très fiable, que le Filet couvre. S'en aller ne
lui rapporte presque rien, et lui coûte sa réputation et une dette qui le suit
(§5, ligne 7).

**Le revers, qu'il faut regarder en face.** Un **nouveau membre** tiré au premier tour
reçoit exactement ce qu'il a mis : sa caution et sa première cotisation. **Pour lui,
la tontine n'est pas un crédit, c'est une épargne.** L'avance, qui fait l'intérêt
d'une tontine, se gagne en montant de niveau. Le réglage du produit est là :
**plus de découvert, plus d'attrait, plus de risque.**

Et avec les réglages actuels, l'avance est rare. Le simulateur (`25` §4, relancé le
29/09) accorde le découvert d'une cotisation dans **7 formats sur 48** seulement, et
celui de deux dans **aucun**. **Aujourd'hui, la tontine SwimPay est une épargne pour
presque tout le monde.** Le levier le moins cher est le fonds de garantie, parce
qu'il est **rendu à la clôture** s'il ne sert pas :

| Fonds de garantie | Recours SwimPay | Découvert d'une cotisation | De deux |
|---|---|---|---|
| 1 % (actuel) | 2 % | 7 formats sur 48 | 0 |
| 3 % | 2 % | 32 sur 48 | 2 |
| 5 % | 2 % | 43 sur 48 | 12 |

### 3.2 Empêcher le dernier de se sentir lésé : **le loyer du temps**

Le dernier est un prêteur. **Il est payé pour avoir prêté.** Une règle, la même pour
tous :

> **Ceux qui ont eu en main l'argent des autres paient un loyer : un taux fixe
> multiplié par ce qu'ils ont eu en main, en tours-francs. Le total est partagé
> entre ceux qui ont attendu, au prorata de ce qu'ils ont avancé.**

Sur l'exemple, membre **confirmé**, taux de 1 % par tour, pour chaque gagnant :

| Tiré au tour | Il a eu en main | Il a avancé | **Loyer du temps** |
|---|---|---|---|
| 1 | 30 000 | 0 | **paie 300 F** |
| 2 | 20 000 | 10 000 | paie 170 F |
| 3 | 10 000 | 30 000 | paie 10 F |
| 4 | 0 | 60 000 | reçoit 180 F |
| 5 | 0 | 100 000 | **reçoit 300 F** |

Ce que cette règle garantit, mesuré :

- **la somme fait zéro** au franc près : c'est un transfert entre membres, **SwimPay
  ne touche rien dessus** (I6) ;
- **elle est impartiale** : personne ne choisit sa place, et la même formule
  s'applique à chacun selon la place que le hasard lui donne ;
- **elle suit le risque réel** : sans découvert, personne n'a l'argent des autres en
  main, et il n'y a rien à compenser. Entre nouveaux membres, le loyer vaut zéro partout ;
- **elle ne peut pas être impayée** : le loyer du débiteur est connu dès le tirage et
  **prélevé sur sa prise**. Celui des créanciers leur est versé à la clôture.

Le loyer est petit parce que la prise protégée a déjà retiré l'essentiel du prêt.
C'est voulu : **le dernier n'est plus lésé, parce qu'il n'a presque plus rien
prêté** ; son argent attendait dans les retenues, en sûreté. Le loyer paie la part
qu'il a vraiment prêtée.

**Trois points à vérifier avant de l'adopter** :

- **C'est économiquement un intérêt.** Le taux doit être **annuel**, converti selon
  la durée du tour (un jour en Éclair, une semaine en Relais, un mois en Marathon), et
  rester sous le **taux d'usure** de l'UEMOA `[H]`. À 1 % par tour, un tour par jour
  ferait un taux annuel illégal ;
- **SwimPay organiserait un prêt rémunéré entre particuliers** : ce qu'en dit la
  réglementation du crédit, à demander au partenaire EME `[H]` ;
- **Beaucoup d'utilisateurs refusent l'intérêt** pour des raisons religieuses. Option :
  le créateur choisit, à la création, **avec ou sans loyer du temps** ; le choix est
  dans le Pacte et vaut pour tous les membres.

---

## 4. Le mode par invitation : la guerre de clan

LO le pose ainsi : les tontines par invitation sont une guerre de clan, donc sujettes
à la fraude. **Rien ne doit pourtant empêcher le système de fonctionner.** On ne
bloque donc pas un clan : **on le fait payer, automatiquement.**

**La règle : des comptes liés sont traités comme un seul emprunteur.** Le graphe des
liens (M2) repère les comptes liés (même appareil, mêmes sources de recharge,
comptes créés ensemble, argent qui circule entre eux). Leurs découverts sont
**additionnés**, et la limite de découvert s'applique à leur total, comme s'ils
étaient une seule personne. Leurs retenues montent en conséquence.

Conséquences :

- **un clan ne gagne rien à se coordonner** : ensemble, ils ne peuvent emporter que ce
  qu'une seule personne pourrait emporter ;
- **l'honnête qui tombe dans une tontine de clan reste protégé** : le Filet a été
  dimensionné pour le pire scénario, et la bande est ce pire scénario ;
- **l'organisateur n'a aucun pouvoir** : ni sur l'argent, ni sur l'ordre, ni sur les
  règles après le tirage.

Les deux modes ont **exactement les mêmes règles**. Le mode ne change que la manière
dont les membres arrivent.

---

## 5. Chaque cas a sa règle : la table de décision

C'est ici que se joue « maîtriser le système de A à Z ». Chaque ligne est appliquée
par le code, sans exception et sans humain.

| # | Situation | La règle, déterministe |
|---|---|---|
| 1 | Le groupe ne se remplit pas dans le délai | Annulation, tout ce qui a été bloqué est rendu |
| 2 | Un membre échoue au test d'éligibilité | Il n'entre pas ; sa place reste ouverte jusqu'au délai |
| 3 | Un membre part **avant** le tirage | Tout lui est rendu |
| 4 | Un membre veut partir **après** le tirage | Impossible : le Pacte est scellé |
| 5 | Une cotisation manque à l'échéance, **quelle qu'en soit la cause** | La même échelle pour tous : délai de grâce, pénalité, puis le Filet paie. **Le système ne cherche pas le motif** : il n'a pas à juger si c'est de la mauvaise foi ou un malheur |
| 6 | Le défaillant n'avait **pas encore reçu** | Sa place est proposée automatiquement à la liste d'attente ; le remplaçant paie d'abord les cotisations échues (M16). Sinon, sa prise future sert à rembourser le Filet, et le reste lui revient à la clôture |
| 7 | Le défaillant **avait déjà reçu** | Sa retenue et sa caution sont saisies, le Filet couvre le reste. Sa dette le suit : **toute entrée future sur son compte SwimPay la rembourse d'abord**, automatiquement (clause du Pacte, à valider avec le partenaire EME `[H]`). Il perd son niveau. Le recouvrement en justice, s'il le faut, se passe hors du chemin de la tontine |
| 8 | **Décès** d'un membre | Pour la tontine, c'est la ligne 5, 6 ou 7 : elle n'a pas besoin de le savoir. Ce qui revient au membre (prise à venir, caution, loyer) est versé **sur son compte SwimPay**, et la succession se règle **au niveau du compte**, selon la loi, hors de la tontine `[H]` |
| 9 | « J'ai payé » | Le Carnet répond : la cotisation y est, ou n'y est pas. Pas de discussion possible |
| 10 | « Le tirage est truqué » | Le tirage est vérifiable par n'importe quel membre (M8). La vérification est dans l'app |
| 11 | « Je n'avais pas compris les règles » | Le Pacte signé, avec **ses propres chiffres** affichés avant la signature (§6), fait foi |
| 12 | **Une panne de SwimPay** ou d'un rail à l'échéance | La tontine se suspend, l'horloge s'arrête, personne n'est compté en retard (I10) |
| 13 | **Une erreur prouvée de SwimPay** fait perdre de l'argent à un membre | **Compensation automatique**, déclenchée par les journaux du système, payée par une réserve d'incidents de SwimPay `[H]` |
| 14 | Une cotisation arrive **en double** | La seconde est rendue automatiquement |
| 15 | Un versement de prise échoue en route | Jamais relancé à l'aveugle : on vérifie ce qui est parti, puis on complète (exécution unique) |
| 16 | Une recharge par carte est annulée après coup | L'argent rechargé par carte n'entre dans une tontine qu'après un délai de sécurité. Le Mobile Money, lui, est définitif |
| 17 | Une prise ferait dépasser le plafond de monnaie électronique | Elle est versée sur la banque du gagnant ; sans banque reliée, le surplus attend sur une enveloppe à son nom |
| 18 | Une autorité judiciaire gèle un membre | Ses fonds sont gelés selon l'ordre ; pour la tontine, c'est la ligne 5 |
| 19 | Le compte d'un membre est piraté | La prise ne va que sur son compte ; tout retrait vers un compte nouvellement ajouté est retardé et demande une double confirmation |
| 20 | Des comptes liés entrent dans le même événement | La règle du clan (§4) |
| 21 | La réconciliation du jour trouve un **écart** entre le Grand livre et le solde réel chez le partenaire EME | L'écart est une faute de SwimPay par définition : la réserve d'incidents le comble aussitôt, la tontine continue. Au-delà de la réserve : ligne 12, suspension. L'enquête se fait hors du chemin de la tontine |

**Les litiges disparaissent presque tous** parce qu'ils portent sur des faits que le
système enregistre et prouve. Il ne reste que des questions de loi (décès, décision de
justice), traitées au niveau du compte, jamais par la tontine.

---

## 6. Les quatre points de vue, plus celui de SwimPay

| | Ce qu'il veut | Ce qu'il craint | Ce que le système lui garantit, ou lui interdit |
|---|---|---|---|
| **Le créateur** (l'organisateur) | Réunir son groupe, voir la tontine avancer | Être tenu pour responsable si quelqu'un ne paie pas | Il ne détient ni l'argent ni l'ordre ; **il n'est responsable de rien** : le système l'est. Il ne peut ni tricher, ni être accusé de tricher |
| **L'utilisateur de bonne foi** | Recevoir sa prise complète, à la date prévue | Qu'un autre parte avec l'argent | **Sa prise complète**, toujours (I4). S'il est tiré tard, **le loyer du temps le paie** pour avoir prêté |
| **L'utilisateur de mauvaise foi** | Toucher tôt et partir ; ou tricher sur l'ordre ; ou entrer avec plusieurs comptes | — | Il ne peut emporter que ce que le Filet couvre. L'ordre ne dépend pas de lui. Ses comptes liés ne comptent que pour un. **L'arnaque ne rapporte rien** |
| **Celui qui ne sait pas** | Participer comme dans une tontine de quartier | Se tromper sans le savoir | **Avant de signer, il voit ses propres chiffres** : ce qu'il paie, chaque jour ; ce qu'il recevra selon sa place ; la retenue ; le loyer ; ce qui se passe s'il ne paie pas. Surtout, s'il est nouveau, **on lui dit en clair que tiré au premier tour, il ne recevra que ce qu'il a mis**. C'est le malentendu le plus probable, donc le litige le plus probable. Une double confirmation empêche l'entrée par erreur. Et comme nouveau membre, il ne peut rien perdre |
| **SwimPay** | Faire tourner le service sans risque de faillite ni de poursuite | Porter un risque non maîtrisé, promettre ce qu'il ne tient pas | Son risque est **plafonné** (dernier recours borné, prouvé par le simulateur). Il ne promet que les invariants que le code vérifie. **Le déterminisme est sa défense** : chaque décision se rejoue et se prouve, devant un membre comme devant un juge |

---

## 7. Ce qu'il reste à trancher

- [ ] **L'avance** (§3.1) : le fonds de garantie, rendu à la clôture, à 1 %, 3 %
      ou 5 % du tour. C'est lui qui décide si la tontine SwimPay est un crédit ou une
      épargne. Et, pour un nouveau membre tiré premier qui ne reçoit que ce qu'il a mis :
      accepter (la première tontine est une épargne, l'avance se gagne), ou lui ouvrir
      aussi un découvert.
- [ ] **Le loyer du temps** (§3.2) : l'adopter, son taux annuel, et le choix
      « avec ou sans » laissé au créateur. Puis les deux vérifications `[H]` :
      taux d'usure, et prêt rémunéré entre particuliers.
- [ ] **La clause de compensation** (ligne 7) : une dette de tontine remboursée par
      les entrées futures du compte. À valider avec le partenaire EME.
- [ ] **La réserve d'incidents** de SwimPay, qui compense automatiquement ses propres
      erreurs (ligne 13) : son montant.
- [ ] **Le décès** (ligne 8) : confirmer que la tontine le traite comme un défaut, et
      que la succession se règle au niveau du compte.
- [ ] **Le délai de sécurité** d'une recharge par carte (ligne 16).
- [ ] **Le délai de suspension** maximal avant annulation et remboursement (ligne 12).

Ensuite : **la facturation du service.**
