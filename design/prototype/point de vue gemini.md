pdv de gemini

## 1. Failles et possibilités de vol (Q1)

**L'attaque par "Blanchiment et abandon" (AML)**
Un réseau utilise la tontine pour blanchir des fonds. Des comptes "mules" rechargés avec des fonds illicites entrent dans une tontine avec un compte "propre". Les mules font exprès de faire défaut rapidement. Leurs cautions de 35 % sont saisies et redistribuées aux "membres honnêtes" (le compte propre) en fin de cycle. Le compte propre encaisse de l'argent légitimé par le système d'arbitrage de SwimPay, transformant une pénalité en outil de transfert intraçable.

**La faille de "La limite de plafond sans filet"**
Le point §7.17 stipule que si la cagnotte fait dépasser le plafond de 2 000 000 F, elle est versée sur la banque. Si l'utilisateur n'a pas lié de compte bancaire valide (ou s'il a été fermé), l'argent est bloqué dans les limbes transactionnelles. L'API du partenaire EME rejettera le crédit, SwimPay a déjà débité les autres.

## 2. Injustices systémiques (Q2)

**Le piège de liquidité du premier gagnant (Bloquant)**
Le modèle détruit mathématiquement l'intérêt d'être le premier gagnant.

* **Décaissement initial :** Le membre sort 45 000 F de sa poche (10 000 F de cotisation + 35 000 F de caution).
* **Encaissement au gain (Tour 1) :** Il touche 15 000 F (ses 10 000 F versés + l'avance de 5 %).
* **Solde net le jour de sa "victoire" : - 30 000 F.**
Il est absurde de "gagner" une tontine et de se retrouver avec moins de liquidités qu'avant d'y entrer. Ce n'est plus un prêt rotatif, c'est un compte séquestre pénalisant.

**L'incitation perverse à la défaillance des autres**
Selon §9.2, quand 3 gagnants fuient, les membres honnêtes *gagnent* jusqu'à +10 286 F grâce à la saisie des cautions. Une tontine est censée être un jeu à somme nulle. Rendre la défaillance d'autrui hautement profitable transforme le produit en un produit dérivé spéculatif où l'on espère que les autres feront faillite.

## 3. Les situations sans règle (Angles morts) (Q3)

* **Le retardataire de bonne foi :** Un membre manque de réseau le jour de l'échéance (Tour 3). Le système saisit sa caution de 35 000 F pour couvrir les 10 000 F. Le lendemain, il recharge son compte. Le système lui restitue-t-il sa caution ? La puise-t-il de nouveau à la fin ? Le document ne prévoit que la fuite totale, ignorant les simples retards de trésorerie qui représentent 90 % des défauts réels.
* **La contestation de KYC post-tirage :** Un utilisateur prouve que son identité a été usurpée (fausse carte ou faille du contrôle biométrique) *pendant* que la tontine tourne. Si SwimPay gèle le compte frauduleux pour investigation légale, qui paie le tour du jour ?

## 4. Calibrage des paramètres (Q4)

L'équation actuelle (Caution 35% + Avance 5%) garantit le risque zéro pour SwimPay, mais crée un produit invendable.

* **Supprimer la caution initiale de 35 % :** C'est une barrière à l'entrée colossale. Ceux qui ont 35 000 F à immobiliser pour une cagnotte de 100 000 F n'ont pas besoin de tontine, ils utilisent l'épargne classique.
* **Remplacer par une garantie dynamique :** Si le système purement déterministe exige 0 % de risque pour l'opérateur, la seule solution mathématique pour augmenter l'avance (ex: 40 %) est d'exiger des garants (autres utilisateurs SwimPay qui bloquent une fraction de leur solde en collatéral) au lieu de bloquer l'argent du participant lui-même.

## 5. Attractivité face au marché (Q5)

**Le produit n'est pas attractif (Bloquant).**
Face à une tontine de quartier, SwimPay perd sur tous les tableaux pour les emprunteurs (les premiers tours) :

1. **Tontine locale :** Mise 10 000 F, reçoit 100 000 F en cash le jour 1. Coût : 0 F.
2. **SwimPay :** Mise 45 000 F, reçoit 15 000 F le jour 1, le reste est bloqué. Coût : 3 000 F.

Le système ne séduira que les "prêteurs" (ceux qui visent les derniers tours pour forcer leur épargne et toucher le bonus de 3 %). Sans emprunteurs attirés par une liquidité immédiate, les groupes ne se rempliront pas.

## 6. Risques juridiques en zone UEMOA et OHADA (Q6)

**La clause pénale abusive (OHADA)**
Saisir la *totalité* de la caution de 35 000 F pour un défaut de 10 000 F (et redistribuer le surplus aux autres) s'apparente à une clause pénale manifestement excessive. Le droit OHADA permet au juge de modérer ou d'annuler une telle saisie. Si un utilisateur saisit l'Observatoire de la Qualité des Services Financiers (OQSF), SwimPay perdra et devra rembourser la différence.

**Le recouvrement forcé sur fonds futurs**
Le §7.6 (la dette rembourse automatiquement toute entrée future sur le compte) est dangereux. En UEMOA, un compte de monnaie électronique n'est pas un compte courant bancaire. Saisir des fonds entrants d'office pour rembourser une dette contractée sur un service tiers (la tontine) nécessite un mandat de prélèvement très spécifique. Sans ce mandat légal explicite, c'est une appropriation illicite de fonds.


pdv de deepseek

La lecture de votre spécification est un exercice utile. Le document est dense, structuré, et tente de répondre par avance à de nombreuses objections. Mais mon rôle n'est pas de le féliciter. C'est de le casser. Voici ce que donne une simulation sans complaisance, du meilleur scénario au pire.

---

## 1. Vérification des simulations : le pire cas du §9.1 est-il vraiment couvert ?

Le document affirme qu'avec une avance de 5 % et une réserve de 2 %, **SwimPay ne paie jamais rien, sur les 48 formats**, même si le tiers des premiers gagnants fuit.

Vérifions sur l'exemple canonique : 10 membres, 10 tours, 10 000 F, cagnotte 100 000 F, caution 35 000 F.

**Scénario : les 3 premiers gagnants fuient au tour 4.**

Chaque fuyard a reçu son tour, a payé sa cotisation du tour de gain et les suivantes jusqu'au tour 3.

| | Gagnant 1 | Gagnant 2 | Gagnant 3 |
|---|---|---|---|
| A reçu (avance 5 %) | 5 000 | 5 000 | 5 000 |
| A payé avant de fuir | 30 000 | 20 000 | 10 000 |
| Part bloquée restante (cagnotte − avance − cotisations payées par le blocage) | à calculer | à calculer | à calculer |
| Caution | 35 000 | 35 000 | 35 000 |
| **Total récupérable** | **?** | **?** | **?** |

Le point clé : le fuyard a une **part bloquée** (le reste de sa cagnotte) **plus** une **caution**. La part bloquée paie automatiquement ses cotisations suivantes. Quand il fuit, ce qui reste de la part bloquée est perdu pour lui, mais **récupéré par le système**.

Le calcul exact dépend de l'ordre dans lequel la part bloquée est consommée. Si elle est consommée **avant** que le fuyard ne paie de sa poche, alors au tour 4, sa part bloquée a déjà payé 3 cotisations de 10 000 = 30 000 F. Il reste :

- Gagnant 1 : 100 000 − 5 000 (avance) − 30 000 = 65 000 F de part bloquée
- Gagnant 2 : 100 000 − 5 000 − 20 000 = 75 000 F
- Gagnant 3 : 100 000 − 5 000 − 10 000 = 85 000 F

**Total récupérable des 3 fuyards : 65 000 + 75 000 + 85 000 = 225 000 F**, sans compter les cautions.

Le trou total laissé par les 3 fuyards :
- Gagnant 1 doit 6 cotisations × 10 000 = 60 000 F
- Gagnant 2 doit 7 × 10 000 = 70 000 F
- Gagnant 3 doit 8 × 10 000 = 80 000 F
- **Total dû : 210 000 F**

**225 000 F récupérables > 210 000 F dus.** Le système est couvert, même sans les cautions, même sans la réserve.

Le chiffre du document (48/48 formats couverts) semble donc **arithmétiquement plausible**. Mais cela repose sur une hypothèse implicite : **que la part bloquée est consommée en premier**, avant que le participant ne paie de sa poche. Si c'est l'inverse (le participant paie de sa poche tant qu'il peut, et la part bloquée est consommée en dernier), le calcul change.

**Question bloquante pour les relecteurs : dans quel ordre la part bloquée et les paiements volontaires sont-ils consommés ?** Le document ne le dit pas explicitement. C'est une faille de spécification.

---

## 2. Simulation : les scénarios du meilleur au pire

### Scénario A — Tout le monde paie (le meilleur)

Dix membres honnêtes. Chacun paie 10 000 F × 10 tours = 100 000 F. Chacun reçoit sa cagnotte de 100 000 F, moins les frais de 3 % (3 000 F), moins sa contribution au bonus des derniers (3 % × 100 000 = 3 000 F répartis sur 10 membres = 300 F), moins la réserve de 2 % (2 000 F, mais rendue à la clôture).

Bilan par membre : **−3 900 F** (frais + bonus). Les trois derniers récupèrent 3 000 F de bonus, donc **−900 F**.

C'est cohérent avec le §9.2. Le produit fonctionne. Personne ne perd d'argent au-delà des frais. C'est acceptable.

### Scénario B — Un participant abandonne avant d'avoir gagné

Il a payé 3 cotisations, puis abandonne. Sa part bloquée (future cagnotte) n'existe pas encore. Sa caution de 35 000 F est saisie.

Sur sa caution :
- 30 000 F couvrent ses cotisations manquées (3 restantes ? non : il devait 7 cotisations, mais le système n'a besoin que de couvrir les cotisations jusqu'à son tour, qui est annulé).
- En réalité, s'il n'a pas encore gagné, son tour est annulé. Les cotisations qu'il devait **n'ont pas à être payées** par le groupe puisqu'il n'a rien reçu. Mais le groupe comptait sur lui pour alimenter les cagnottes des autres.

C'est là que le calcul se complique. Si un membre du **milieu** abandonne avant son tour, les cagnottes des tours précédents ont déjà été distribuées en comptant sur ses cotisations. Son abandon crée un **trou de financement** pour les tours suivants, mais aussi une **perte de cagnotte** pour les tours précédents qui ont été sur-financés par rapport à ce qu'il aurait dû recevoir.

Le document traite ce cas au §7 ligne 5 : « À son tour, sa cagnotte est entièrement bloquée : elle paie ses cotisations manquées et rembourse la réserve ; le reste lui est rendu à la clôture. »

Mais si son tour **n'arrive jamais** (parce qu'il abandonne et que son tour est supprimé ou réattribué), que se passe-t-il ? Le document ne le dit pas clairement. **Faille.**

### Scénario C — Le gagnant du tour 1 fuit

Il reçoit 15 000 F (avance de 5 % + cotisation déjà payée). Il fuit. Sa part bloquée est de 85 000 F. Sa caution de 35 000 F est saisie.

Ce qu'il a emporté : 15 000 F.
Ce qu'il a payé : 10 000 F.
**Gain net de la fuite : +5 000 F.**

Le système récupère 85 000 F de part bloquée + 35 000 F de caution = 120 000 F, pour couvrir 90 000 F de cotisations futures. **Le groupe gagne 30 000 F.**

Le document le dit : « fuir fait perdre 30 000 F ». C'est exact.

### Scénario D — Le gagnant du tour 5 fuit

Il a reçu sa cagnotte au tour 5. Avance de 5 % : 5 000 F. Il a payé 5 cotisations de 10 000 = 50 000 F. Sa part bloquée restante : 100 000 − 5 000 − 50 000 = 45 000 F.

Il fuit. Il emporte 5 000 F d'avance. Il perd 45 000 F de part bloquée + 35 000 F de caution. **Perte nette de la fuite : 75 000 F.** Personne de sensé ne fait ça.

### Scénario E — Les 3 premiers fuient (pire cas simulé)

Déjà vérifié ci-dessus. Le système est couvert. Le groupe **gagne** de l'argent grâce aux cautions saisies. Les membres honnêtes terminent avec +7 286 à +10 286 F selon le document.

C'est **mathématiquement possible**, mais cela signifie que les honnêtes **gagnent plus que s'il n'y avait pas eu de fuite**. C'est un résultat contre-intuitif mais pas absurde : les cautions saisies sont une pénalité qui bénéficie aux victimes.

### Scénario F — Fuite corrélée : 5 gagnants sur 10 fuient

Le document ne simule que 3 fuites sur 10. Que se passe-t-il si 5 fuient ?

Tour 1, 2, 3, 4, 5 fuient au tour 6.

| Fuyard | Part bloquée restante au tour 6 | Caution | Total récupéré | Dû restant |
|---|---|---|---|---|
| 1 | 100 − 5 − 50 = 45 | 35 | 80 | 50 |
| 2 | 100 − 5 − 40 = 55 | 35 | 90 | 60 |
| 3 | 100 − 5 − 30 = 65 | 35 | 100 | 70 |
| 4 | 100 − 5 − 20 = 75 | 35 | 110 | 80 |
| 5 | 100 − 5 − 10 = 85 | 35 | 120 | 90 |

Total récupéré : 80 + 90 + 100 + 110 + 120 = **500 000 F**.
Total dû : 50 + 60 + 70 + 80 + 90 = **350 000 F**.

Le système est **largement couvert**. Les 5 membres honnêtes restants se partagent 150 000 F de surplus. Chacun gagne 30 000 F.

**Mais** : la tontine s'effondre structurellement. Il ne reste que 5 membres pour 10 tours. Les cagnottes des tours restants ne peuvent plus être financées. Le système doit **annuler** ou **restructurer** la tontine.

C'est le vrai problème : **le mécanisme financier tient, mais la tontine meurt**. Le document ne traite pas ce cas. **Faille majeure.**

### Scénario G — Le pire absolu : tout le monde fuit sauf le dernier

Neuf membres fuient après avoir reçu leur tour. Le dernier n'a pas encore reçu.

Les neuf fuyards laissent leurs parts bloquées et leurs cautions. Le système récupère énormément d'argent. Mais le dernier ne peut plus recevoir sa cagnotte, car il n'y a plus assez de participants pour alimenter le pot.

Le système a **assez d'argent** pour rembourser le dernier (les parts bloquées + cautions saisies des 9 fuyards). Mais le dernier voulait une **cagnotte**, pas un remboursement. Le document ne dit pas ce qui se passe dans ce cas.

**Faille : le dernier gagnant dans une tontine qui s'effondre.** Que reçoit-il ? Ses cotisations ? Une compensation ? Rien ?

---

## 3. Les paramètres : critique sans complaisance

### Caution de 35 %

Le document reconnaît lui-même la limite (§10.2) : « La caution de 35 % exclut ceux qui n'ont pas cette somme d'avance, c'est-à-dire une partie de ceux qui ont le plus besoin d'une tontine. »

C'est un aveu majeur. La tontine est un produit d'**inclusion financière**. Si la caution exclut les plus pauvres, le produit rate sa cible.

**Alternative** : une caution **progressive**. Par exemple, 15 % à l'entrée, puis un complément prélevé sur les premières cagnottes. Ou une caution **garantie par un tiers** (un membre de la famille, un employeur). Ou une caution **sous forme de nantissement** sur un actif (un téléphone, un bien).

### Avance de 5 %

Le document justifie le 5 % par la simulation du §9.1. Mais 5 % de 100 000 F = 5 000 F. Est-ce que 5 000 F « utilisables » justifient de rejoindre une tontine de 10 mois ? C'est **très peu**. Le gagnant du tour 1 a l'impression de ne rien recevoir.

**Alternative** : une avance **variable selon la position**. Le premier reçoit 5 %, le cinquième 15 %, le dernier 100 %. Plus la position est tardive, moins le risque de fuite est grand, plus l'avance peut être élevée. Cela rend les positions tardives **plus attractives** sans augmenter le risque.

### Réserve de 2 %

2 % de 100 000 F = 2 000 F par tour. Sur 10 tours, 20 000 F. C'est la réserve qui couvre les défauts. Si elle n'est pas utilisée, elle est rendue. C'est acceptable, mais cela signifie que les membres **prêtent** 20 000 F au système pendant 10 mois. Coût d'opportunité : ~1 000 F. Acceptable.

### Bonus de 3 %

3 % de la cagnotte pour le dernier tiers. Sur 10 tours, les tours 8, 9, 10 reçoivent 3 000 F chacun. C'est financé par le groupe.

**Problème** : le groupe paie **9 000 F** (3 × 3 000) pour rééquilibrer. Mais le groupe n'est pas uniformément pénalisé. Les membres des tours 1 à 7 paient aussi. Au final, chaque membre paie 900 F (9 000 / 10) pour financer le bonus des derniers. Les derniers reçoivent 3 000 F chacun, donc leur coût net est de 3 900 − 3 000 = 900 F. Les premiers paient 3 900 F.

Donc les premiers **subventionnent** les derniers. C'est le principe même du rééquilibrage. Mais est-ce juste ? Le premier a déjà le coût du temps (il reçoit tôt, mais ne peut pas tout utiliser). Il paie aussi pour le dernier. C'est une double pénalité.

**Alternative** : financer le bonus des derniers par les **frais de SwimPay**, pas par le groupe. SwimPay reverse 1 % de ses frais aux derniers. Cela aligne les intérêts : SwimPay gagne plus si la tontine se termine bien.

### Frais de 3 %

3 % de la cagnotte, prélevés au gain. Sur 100 000 F, 3 000 F. Le document compare à Money Fellows, qui facture jusqu'à 16 % aux premières places. Mais Money Fellows **avance l'argent** (il donne la cagnotte complète au premier). Ici, SwimPay n'avance rien. La comparaison est donc boiteuse.

**Question** : 3 % est-il compétitif par rapport à une tontine de quartier **gratuite** ? Le document pose la question au §11.5. La réponse est : non, si le seul critère est le coût. Mais si le critère est la **sécurité**, alors 3 % peut se justifier. Encore faut-il que les utilisateurs valorisent la sécurité à 3 000 F sur 100 000 F.

---

## 4. Les failles de spécification

### Faille 1 : Ordre de consommation de la part bloquée

Le document ne précise pas si la part bloquée est consommée avant ou après les paiements volontaires. Cela change tous les calculs de couverture.

**Recommandation** : spécifier explicitement que la part bloquée est **toujours consommée en premier**, jusqu'à épuisement, avant tout prélèvement sur le solde libre du participant.

### Faille 2 : Tontine qui s'effondre

Si trop de membres fuient, la tontine ne peut plus continuer. Que se passe-t-il pour les membres honnêtes qui n'ont pas encore reçu ? Le document ne le dit pas.

**Recommandation** : ajouter une règle de **liquidation**. Si le nombre de membres actifs tombe en dessous d'un seuil (par exemple, B+1, pour qu'il reste au moins un tour possible), la tontine est liquidée. Les parts bloquées et cautions saisies sont distribuées aux membres restants, au prorata de leurs cotisations versées. Le document doit préciser ce seuil et cette règle.

### Faille 3 : Abandon avant le tour

Le §7 ligne 5 traite l'abandon d'un membre **qui n'a pas encore gagné** en disant que « à son tour, sa cagnotte est entièrement bloquée ». Mais si son tour n'arrive jamais (parce qu'il abandonne et que le système décide de ne pas lui attribuer de tour), que se passe-t-il ?

**Recommandation** : clarifier. Si un membre abandonne avant son tour, son tour est **réattribué** aux membres restants (par un nouveau tirage ou par un ordre prédéfini). Sa caution couvre les cotisations qu'il devait jusqu'à son tour. Le reste lui est rendu.

### Faille 4 : Comptes liés (§7 ligne 19)

Le document dit que les comptes liés « comptent comme une seule personne ». Mais comment détecter les comptes liés ? Même appareil ? Même adresse IP ? Même source de fonds ? Le document ne donne pas de critères précis. C'est une règle **inapplicable** en l'état.

**Recommandation** : définir des **indices de liaison** (même numéro de téléphone, même pièce d'identité, même compte bancaire source, même appareil utilisé de manière répétée) et une **procédure** (alerte automatique, revue, décision). Mais attention : « aucun humain ne décide » est un principe du document. Qui applique la règle des comptes liés ?

### Faille 5 : Décès et succession

Le §7 ligne 7 dit que le décès est traité comme la ligne 4 (cotisation manquante) et que la succession se règle au niveau du compte. Mais si le défunt a déjà reçu sa cagnotte et doit encore des cotisations, sa part bloquée et sa caution sont-elles saisies ? La succession doit-elle payer ? Le document ne le dit pas clairement.

**Recommandation** : ajouter une clause de **décès** explicite. La dette de cotisation s'éteint-elle ? La caution est-elle rendue à la succession ? La part bloquée est-elle versée à la succession ou saisie pour couvrir les cotisations manquées ?

---

## 5. Risques juridiques (UEMOA / Côte d'Ivoire)

### Qualification de l'activité

Le document dit que SwimPay n'est pas une banque et que les fonds sont détenus par un partenaire EME agréé. C'est une **bonne architecture**. Mais la question reste : **la tontine elle-même est-elle une activité réglementée ?**

La BCEAO réglemente les services de paiement et la monnaie électronique. Une tontine organisée en ligne, avec des fonds détenus par un EME, pourrait être vue comme :
- un service de paiement (si SwimPay exécute des transferts entre membres),
- une collecte d'épargne (si SwimPay reçoit et conserve des fonds),
- une activité d'assurance (si la caution joue un rôle de garantie mutuelle).

Le document mentionne cette hypothèse au §10.6. **C'est la question la plus importante du document.** Elle conditionne tout le reste.

**Recommandation** : obtenir un avis juridique **avant** le lancement. Si la tontine est qualifiée de collecte d'épargne, elle est réservée aux établissements agréés (banques, SFD, EME). SwimPay devrait soit obtenir un agrément, soit s'associer à un partenaire agréé qui porte l'activité de tontine.

### Saisie de la caution

Le §10.4 reconnaît que « saisir tout le reste de la caution d'un fuyard peut dépasser le tort causé : un juge pourrait réduire cette sanction. » C'est un risque réel. Une caution de 35 % de la cagnotte, saisie en totalité, peut être considérée comme une **clause pénale excessive** au sens du droit civil ivoirien. Un juge pourrait la réduire.

**Recommandation** : limiter la saisie de la caution à **ce qui est nécessaire pour couvrir le tort causé** (les cotisations manquées + les frais de gestion). Le reste est rendu au fuyard, même s'il a fui. Cela réduit l'incitation à fuir (il perd sa part bloquée, ce qui est déjà dissuasif) sans risquer une requalification judiciaire.

### Dette qui suit le participant

Le §7 ligne 6 dit que « sa dette le suit : toute entrée future sur son compte SwimPay la rembourse d'abord ». Cela nécessite une clause acceptée par le partenaire EME et par le participant. Sans cette clause, SwimPay ne peut pas prélever sur les futurs dépôts.

**Recommandation** : intégrer cette clause dans le Pacte signé à l'entrée. Mais vérifier sa validité juridique avec un conseil local.

---

## 6. Verdict : ce qui est bloquant vs ce qui est un détail

### Bloquant

1. **Qualification juridique de la tontine.** Tant que ce n'est pas tranché, le produit ne peut pas être lancé. C'est la question n°1.
2. **Ordre de consommation de la part bloquée.** Non spécifié. Change tous les calculs de couverture.
3. **Liquidation d'une tontine qui s'effondre.** Non spécifié. Que reçoit le dernier ?
4. **Détection des comptes liés.** Règle inapplicable sans critères précis.
5. **Caution de 35 %.** Exclut les plus pauvres. Un juge peut la réduire.

### Détail (mais à corriger)

6. Avance de 5 % fixe. Pourrait être variable selon la position.
7. Bonus de 3 % financé par le groupe. Crée une double pénalité pour les premiers.
8. Frais de 3 %. À comparer avec la valeur perçue de la sécurité.
9. Décès et succession. À clarifier.
10. Abandon avant le tour. À clarifier.

---

## 7. Ce que je changerais, personnellement

1. **Avance variable selon la position.** Premier : 5 %. Milieu : 10 %. Dernier : 30 %. Le risque de fuite décroît avec la position, donc l'avance peut croître.
2. **Caution progressive.** 15 % à l'entrée, 20 % prélevés sur la première cagnotte. Cela réduit la barrière à l'entrée.
3. **Bonus des derniers financé par SwimPay**, pas par le groupe. 1 % des frais reverse aux derniers. Aligne les intérêts.
4. **Liquidation automatique** si le nombre de membres actifs tombe en dessous d'un seuil.
5. **Ordre de consommation explicite** : part bloquée d'abord, solde libre ensuite.

---

## Conclusion

Le document est **sérieux**. Il a le mérite de poser les bonnes questions, de reconnaître ses limites, et de demander une relecture critique. Mais il contient des **failles de spécification** qui, si elles ne sont pas comblées, rendront le système imprévisible en cas de crise.

La plus grave n'est pas technique, elle est **juridique** : la qualification de la tontine en droit UMOA. Tant que ce n'est pas tranché, tout le reste est théorique.

La deuxième plus grave est **opérationnelle** : que se passe-t-il quand la tontine s'effondre ? Le document ne le dit pas.

Si vous voulez, on peut maintenant :
1. Poser les formules exactes de l'avance variable et de la caution progressive.
2. Écrire la spécification de la liquidation.
3. Simuler les scénarios d'effondrement avec des chiffres précis.