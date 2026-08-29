# Six modèles d'algorithme — à choisir

> Demande de LO : *« sors-moi différents modèles d'algorithme pour notre appli,
> avec des combinaisons de solutions disponibles par API, en utilisant le netting
> et d'autres méthodes de finance. Explore des idées auxquelles je n'ai pas
> pensé. »*
>
> Six modèles complets, chacun avec ce qu'il exige, ce qu'il rapporte et **ce qui
> le casse**. Ils ne s'excluent pas tous : la fin du document propose une
> combinaison. Rien ici n'est un engagement — c'est un menu.

---

## 0. Le PI-SPI, puisque la question est posée

**Ce que c'est** : la Plateforme Interopérable du Système de Paiement Instantané
de la BCEAO. Lancée officiellement le **30 septembre 2025 à Dakar**. Site dédié :
`pispi.bceao.int`. Elle permet à toute personne ayant un compte dans l'un des huit
pays de l'UEMOA d'envoyer et recevoir en quelques secondes, **24 h/24, quel que
soit le réseau**. `[T]`

**Qui peut y participer**, mot pour mot : *« Les banques, les institutions de
microfinance, les émetteurs de monnaie électronique et les établissements de
paiement participent au système PI-SPI. »*

> **On ne « l'obtient » pas. C'est une infrastructure réservée aux
> établissements licenciés.**

Trois conséquences directes :

1. **SwimPay ne peut pas s'y connecter** tant qu'il n'est ni EP ni EME.
2. **Mais notre partenaire licencié, lui, y est** — ou doit y être : la BCEAO
   avait fixé la connexion au **30 juin 2026**, délai depuis **prolongé**. Au
   24 juin 2026, **80 participants** étaient connectés. *Question à poser à
   PayDunya, Julaya, CinetPay : êtes-vous raccordés, et que nous facturez-vous
   pour y passer ?*
3. **C'est gratuit pour les particuliers.** Ce qui est facturé aux participants
   n'est pas public.

**La FAQ officielle mentionne un « Sandbox »** sans le lier publiquement. À
demander.

---

## 1. Les briques disponibles

Avant les modèles, l'inventaire de ce avec quoi on compose.

| Brique | Ce qu'elle donne | Coût | État |
|---|---|---|---|
| **API DGI FNE** | facture certifiée, numéro officiel, QR | 20 F/facture, **gratuit ≤ 5 000 F** | clé à obtenir |
| **API Orange Money** | dépôts, retraits, **paiements en masse**, paiement marchand | non publié | ouverte aux développeurs `[V]` |
| **Wave Business** | encaissement QR et liens, sans code | ~1 % `[T]` | compte à ouvrir |
| **MTN MoMo** | sandbox libre | — | disponible |
| **Julaya** | versement 0,5–1,5 %, **alimentation bancaire gratuite** | `[V]` | commercial |
| **PayDunya** | payin 2,25 %, payout 2,00 % | `[V]` | sandbox ouvert |
| **Hub2 / CinetPay** | 1,8–2,5 % / 1,5–2 % | `[T]` | commercial |
| **PI-SPI** | interopérable, instantané | gratuit aux particuliers | **par le partenaire** |
| **Consultation NCC** | statut TVA, activité, état d'une entreprise | — | reCAPTCHA |

---

## 2. Modèle A — **Le Facilitateur**

*L'argent ne nous touche jamais.*

**Principe.** Chaque marchand garde ses propres comptes (Wave Business, puce
Orange, MoMo). SwimPay orchestre : détecte les entrées, rapproche, émet la FNE,
ordonne les sorties depuis **son** compte à lui.

| | |
|---|---|
| Licence | **aucune** |
| Capital | **0** |
| Float | **0** |
| Coût par franc | **0** — le marchand paie déjà sa commission à son opérateur |
| Revenu | abonnement seul |
| Netting | **impossible** — chaque marchand est un îlot |

**Ce qui le casse** : la friction d'installation. Chaque marchand doit ouvrir et
nous connecter N comptes. Et **un client qui n'a pas de compte marchand n'est pas
servi**.

**Verdict** : le plus sûr, le plus lent à installer, le moins rentable au franc.
**C'est le seul qui peut démarrer demain matin sans rien signer.**

---

## 3. Modèle B — **Le Compensateur**

*Le netting classique, avec des réserves par opérateur.*

**Principe.** Une réserve par opérateur. Une entrée crédite sa boîte, une sortie
débite la boîte de destination. **Rien ne traverse par transaction.** On
rééquilibre sur le net, quand les boîtes dérivent.

**Mesuré** (`17` §7, 400 clients, profils hypothétiques) : compensation **89,7 %**,
coût **0,10 %** du brut contre 2 %, **≈ 42 M F économisés par mois**.

| | |
|---|---|
| Licence | **oui** — les soldes sont détenus. Agent d'un licencié : 0 capital |
| Float | ~15 M F pour 400 clients |
| Coût | **0,10 %** du brut |
| Revenu | abonnement + marge sur le flux, enfin positive |

**Ce qui le casse** : **la vague de retraits.** Multiplier le float par 25 laisse
88 échecs. Toutes les boîtes se vident ensemble, le netting croisé n'a plus rien
à prendre. **Il faut une ligne de crédit, ou des retraits ralentis sous stress.**

**Verdict** : le plus rentable, le plus exposé. **Ne pas le lancer sans la ligne
de crédit.**

---

## 4. Modèle C — **Le Livre Fermé**

*Si les deux bouts sont chez nous, il ne se passe rien.*

**Principe.** Avant tout netting, une question : **le bénéficiaire est-il aussi
client ?** Si oui, ce n'est même pas une compensation — c'est **une écriture
comptable**. Zéro rail, zéro délai, zéro franc.

Le netting ne sert plus qu'aux flux qui **sortent vraiment** du livre.

**Mesuré** (`netting.mjs`, 400 clients) :

| Densité du réseau | Part on-us du brut | Frais |
|---|---|---|
| 0 % | 0 | **0,09 %** |
| 15 % | 4,3 % | 0,05 % |
| **30 %** | 9,1 % | **0,01 %** |
| 50 % | 15,2 % | 0,00 % |
| 70 % + | 21,6 % | **0** — plus rien à déplacer |

> **À 30 % de densité, le coût est divisé par neuf par rapport au netting seul.**

**L'idée que ça débloque, et c'est la plus importante de ce document :**

> ### On ne recrute pas des clients. On recrute des chaînes.

Prendre **une PME, ses 30 employés et ses 5 fournisseurs** vaut infiniment plus
que 36 clients dispersés. Le salaire versé reste dans le livre. L'employé paie
chez un commerçant client : il y reste encore.

Et **chaque paie devient un canal d'acquisition** : 30 salaires = 30 utilisateurs
créés à coût nul, déjà approvisionnés.

**Ce qui le casse** : si les clients retirent tout immédiatement, le livre se
vide et la densité chute. **Le taux d'on-us plafonne à ~26 % du brut** dans la
simulation, parce que les retraits sortent toujours vraiment.

**Verdict** : ce n'est pas un modèle concurrent de B, **c'est une couche
au-dessus de B**. Et c'est surtout une **stratégie commerciale déguisée en
algorithme**.

---

## 5. Modèle D — **L'Escompteur**

*La facture certifiée est une créance. On l'achète.*

**Principe.** Une FNE est une créance **certifiée par l'État**, avec un numéro
officiel, un débiteur identifié par son NCC, un montant et une échéance. C'est
exactement ce qu'un affactureur achète.

Le marchand émet une facture de 2 M à 30 jours. **On lui verse 1,9 M
aujourd'hui.** On encaisse 2 M à l'échéance. La différence est le revenu.

| | |
|---|---|
| Revenu | **3 à 5 % sur 30 jours**, soit 36 à 60 % annualisés |
| Ce qu'il faut | du capital, un partenaire prêteur, et du scoring |
| Ce que la FNE apporte | **le débiteur est identifié et vérifiable** (consultation NCC : actif ? assujetti ?) |

**Pourquoi personne ne peut le faire à notre place** : il faut voir la facture
**et** l'encaissement. Un affactureur classique n'a ni l'un ni l'autre en temps
réel. Une banque ne voit que son compte. **Nous voyons les deux côtés du graphe.**

**Ce qui le casse** : le risque de crédit. Une facture certifiée prouve qu'une
vente a eu lieu, **pas que le client paiera**. Il faut un historique avant de
prêter, et un prêteur licencié pour porter le risque.

**Verdict** : **la plus grosse marge de tout le document**, et la seule qui ne
soit pas un jeu à somme faible sur des points de commission. À préparer dès
maintenant en accumulant l'historique, à lancer en an 2.

---

## 6. Modèle E — **Le Chef d'orchestre**

*Aucune réserve. Chaque mouvement prend le rail le moins cher, à l'instant.*

**Principe.** Pas de float, pas de netting. Pour chaque mouvement, le routeur
interroge tous les rails disponibles, applique les plafonds restants et les
délais, et choisit **le moins cher qui peut le faire maintenant**.

| | |
|---|---|
| Licence | aucune si le partenaire exécute |
| Capital, float | **0** |
| Coût | **le meilleur du marché**, mouvement par mouvement — mais toujours > 0 |
| Complexité | faible |

**Ce qui le casse** : rien ne s'annule. On paie sur le brut, toujours. C'est le
modèle honnête et médiocre : **on ne perd pas d'argent, on n'en gagne pas non
plus sur le flux.**

**Verdict** : la brique de base des autres modèles, pas un modèle à soi seul.
**À écrire quoi qu'il arrive** — B, C et F s'en servent tous.

---

## 7. Modèle F — **Le Prévoyant**

*La facture d'aujourd'hui est la trésorerie de demain.*

**Principe.** Les FNE émises donnent une **prévision d'encaissement** : combien,
chez qui, et — sachant ses habitudes — sur quel opérateur. Le moteur pré-positionne
les réserves **avant** que l'argent bouge.

| | |
|---|---|
| Ce que ça donne | moins de rééquilibrages d'urgence, donc moins de frais et moins de ruptures |
| Ce qu'il faut | la boucle FNE en production, et un historique par marchand |
| Ce que personne d'autre n'a | la facture **avant** le paiement |

**Idée dérivée, et elle est puissante** : la même prévision permet de **détecter
une vague de retraits avant qu'elle n'arrive** — fin de mois, jour de paie,
échéance fiscale. C'est la réponse au point faible du modèle B.

**Verdict** : pas un modèle autonome, **un multiplicateur de B et C**. C'est aussi
le seul avantage que la boucle fiscale donne à la boucle d'argent, et il justifie
à lui seul de faire les deux.

---

## 8. Trois idées de plus, à part

### 8.1 Le score d'acquisition par le graphe des factures

Nous voyons **qui facture qui**. Donc pour chaque prospect, on peut calculer :
*« si je le prends, quelle part de ses flux resterait dans le livre ? »*

**Ça donne un score de recrutement que personne d'autre ne peut calculer.** On
n'attaque plus le marché par secteur ou par quartier, mais **par densité
marginale**. Le commercial reçoit une liste ordonnée par ce qu'elle rapporte au
réseau, pas par la taille de l'entreprise.

### 8.2 Le solde laissé par les clients est le float

Les marchands laissent toujours un fond de caisse. **Cet agrégat est
mathématiquement le float dont le netting a besoin.**

> **Attention, et ce n'est pas négociable** : c'est de l'argent client. Le
> dépenser sans le cadre juridique adéquat est exactement ce que l'interdit du
> repo nomme — *« aucun solde client dépensable avant le contrat
> distributeur-EME »*. À structurer avec le partenaire licencié, pas à
> improviser.

### 8.3 Le rolling reserve, emprunté aux cartes

Retenir 5 à 10 % des encaissements pendant N jours, comme font les acquéreurs de
cartes. Ça finance le float, ça couvre les litiges, et **ça se dit honnêtement au
marchand** parce que c'est la norme du métier ailleurs. À condition de l'écrire
dans le contrat et de le rendre visible dans l'application.

---

## 9. Comparaison, et ce que je recommanderais

| | A Facilitateur | B Compensateur | C Livre fermé | D Escompteur | E Orchestre | F Prévoyant |
|---|---|---|---|---|---|---|
| Licence | non | **oui** | oui | oui + prêteur | non | — |
| Capital | 0 | 0 en agent | 0 en agent | **fort** | 0 | 0 |
| Float | 0 | ~15 M | moins que B | fort | 0 | réduit B |
| Coût du flux | 0 | **0,10 %** | **0,01 %** | — | ~1,5 % | — |
| Marge | abonnement | + flux | ++ flux | **+++** | abonnement | — |
| Démarrable | **demain** | après contrat | après B | an 2 | demain | après FNE |
| Ce qui le casse | friction | **la vague** | les retraits | le risque | rien, mais peu rentable | — |

**La combinaison que je défendrais**, dans cet ordre :

1. **E d'abord** — le routeur au moindre coût. Il faut l'écrire de toute façon,
   il ne coûte rien et il sert à tous les autres.
2. **A en parallèle** — installer chez les premiers marchands sans rien attendre.
   C'est ce qui produit les données dont B a besoin, notamment **le taux de
   compensation réel**.
3. **B quand le contrat partenaire est signé** — et **jamais sans la ligne de
   crédit**.
4. **C dès B** — c'est une condition dans le routeur, pas un chantier. Mais
   surtout : **changer la façon de démarcher dès maintenant** pour recruter par
   chaînes.
5. **F quand la boucle FNE tourne** — il rend B moins cher et moins fragile.
6. **D en an 2**, sur l'historique accumulé.

**Ce qu'il faut décider maintenant, et qui n'est pas technique :**

- accepte-t-on de **ralentir les retraits sous stress**, ou finance-t-on une
  **ligne de crédit** ? Le modèle B ne tient pas sans l'un des deux.
- démarche-t-on **par chaînes** plutôt qu'à l'unité ? Ça change le discours
  commercial des 400 dès demain.

---

## 10. Ce que ces modèles ne disent pas

- **Le taux de compensation réel est inconnu.** Tout le classement de B et C en
  dépend, et il se mesure sur les flux des 400, pas dans un simulateur.
- **Les délais de règlement ne sont pas modélisés.** Un rééquilibrage à trois
  jours n'est pas le même outil qu'un instantané, et c'est probablement ce qui
  aggrave la vague.
- **Les plafonds sont des hypothèses tierces.**
- **Le tarif de la puce marchande Orange n'est pas publié** — et c'est le chiffre
  qui départage A et E.
