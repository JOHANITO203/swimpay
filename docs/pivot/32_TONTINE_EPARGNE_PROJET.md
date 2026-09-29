# Les modes Épargne et Projet de la tontine SwimPay

> Écrit le 29 septembre 2026, après validation de LO. **L'épargne et le projet sont
> deux modes de la tontine, chacun avec un but, et chacun facturé.** Ils reprennent
> les principes de la tontine classique (`31`) : aucun humain ne décide, la même
> règle pour tous, rien ne bloque le système.
>
> L'épargne qui **rapporte des intérêts** est un autre produit : voir
> `33_EPARGNE_REMUNEREE.md`.
>
> `[H]` = à vérifier. Rien n'est codé.

---

## 1. Les trois modes, côte à côte

| | **Classique** (`31`) | **Épargne** | **Projet** |
|---|---|---|---|
| Le but | Toucher une somme à son tour | Mettre de côté ensemble | Payer un achat précis |
| Qui reçoit, et quand | Un gagnant par tour, tiré au sort | **Tout le monde, à la même date** | **Le fournisseur**, à la date |
| Tirage | Oui | Non | Non |
| Caution | 30 % | **Non** : personne ne touche avant les autres, il n'y a rien à voler | **Non**, même raison |
| En groupe ou seul | En groupe | En groupe | **Seul ou en groupe** |
| Frais du système | 3 % | **3 %** | **3 %**, et le fournisseur paie 1 % d'encaissement |

**Le repère des 3 %** colle encore mieux ici : le collecteur de tontine ivoirien
garde environ une mise par mois, soit ~3 %, justement pour garder l'épargne des
gens `[H]`. SwimPay fait la même chose, sans risque que le collecteur disparaisse.

---

## 2. Le mode Épargne

### 2.1 Le principe

Chaque membre verse la même somme à chaque échéance. **L'argent reste bloqué
jusqu'à une date fixée dans le Pacte.** À cette date, chacun récupère ce qu'il a
versé, moins les frais, plus sa part de la récompense des réguliers.

Pourquoi en groupe plutôt que seul : **le groupe tient chacun.** Chacun voit qui a
versé, et personne ne veut être celui qui lâche.

### 2.2 Les règles

| # | Situation | La règle |
|---|---|---|
| 1 | Formats | Les mêmes rythmes que la tontine classique (jour, semaine, mois), de 2 à 30 membres. La date de fin est fixée à la création et **ne change plus** |
| 2 | Entrée | Pièce d'identité et photo du visage, première cotisation bloquée tout de suite, signature du Pacte avec ses propres chiffres |
| 3 | Chaque échéance | Prélevée automatiquement sur le compte SwimPay du membre |
| 4 | **Échéance manquée** | Après le délai de grâce du rythme, elle peut être **rattrapée** à tout moment avant la date de fin. **Chaque échéance manquée et non rattrapée coûte 5 % de son montant**, retenus à la fin. Rattrapée, elle ne coûte rien, mais le membre n'est plus « régulier » |
| 5 | **Sortie avant la date** | Possible à tout moment, pour une urgence. Il récupère ce qu'il a versé, **moins 2 %**, moins les frais. Versé sur son compte SwimPay sous 24 heures |
| 6 | **À la date de fin** | Chacun reçoit ce qu'il a versé, moins les frais (3 %), moins ses pénalités |
| 7 | **La récompense des réguliers** | Les sorties anticipées (2 %) et les pénalités (5 %) sont **partagées à parts égales entre les membres qui ont payé toutes leurs échéances à l'heure**. S'il n'y en a aucun, elles sont partagées entre tous ceux qui sont allés jusqu'à la date |
| 8 | Plafond de monnaie électronique | Au-delà de 2 000 000 F, le surplus est versé sur le compte bancaire vérifié du membre, exigé à l'entrée pour ces montants |
| 9 | Décès | Ce qu'il a versé, moins les frais, est versé sur son compte SwimPay ; la succession se règle au niveau du compte |
| 10 | Panne | La tontine est suspendue, personne n'est compté en retard |

### 2.3 L'exemple chiffré

10 membres, 10 échéances de 10 000 F. Un membre sort après 4 échéances ; un autre
manque 2 échéances et ne les rattrape pas ; les 8 autres paient tout à l'heure.

| Membre | A versé | Reçoit | Détail |
|---|---|---|---|
| Chaque régulier (8) | 100 000 | **97 225** | 100 000 − 3 000 de frais + 225 de récompense |
| Celui qui sort au tour 4 | 40 000 | 38 000 | 40 000 − 800 (sortie) − 1 200 de frais |
| Celui qui manque 2 échéances | 80 000 | 76 600 | 80 000 − 2 400 de frais − 1 000 de pénalité |
| **SwimPay** | — | **27 600** | 3 % de tout ce qui est rendu |

Vérification : 920 000 F versés = 892 400 F rendus + 27 600 F de frais.

---

## 3. Le mode Projet

### 3.1 Le principe

C'est une épargne avec un **achat précis** : la rentrée scolaire, un mouton pour la
Tabaski, une tenue de mariage. À la date, **l'argent va directement au fournisseur**,
pas au membre. Personne ne peut le dépenser ailleurs en route, ni le membre, ni un
proche qui le lui réclamerait.

- **Seul** : « j'épargne pour la rentrée de mes enfants ».
- **En groupe** : « on achète nos moutons ensemble, chez le même vendeur ». Le groupe
  peut négocier un prix, affiché dans le Pacte.

### 3.2 Les règles

| # | Situation | La règle |
|---|---|---|
| 1 | **Le fournisseur** | Obligatoirement un **commerçant vérifié par SwimPay** (pièce, registre de commerce ou autorisation d'activité). **Jamais un compte de particulier** : c'est ce qui empêche de détourner le projet |
| 2 | Le montant | Le prix de l'achat, fixé à la création, affiché dans le Pacte. En groupe, chacun a sa propre commande chez le même fournisseur |
| 3 | Les échéances | Comme le mode Épargne : prélèvement automatique, rattrapage, pénalité de 5 % sur ce qui n'est pas rattrapé |
| 4 | **Changer de fournisseur** | Possible jusqu'à 7 jours avant la date, **seulement vers un autre commerçant vérifié**. En groupe, chaque membre peut changer pour sa propre commande |
| 5 | **À la date, le montant est atteint** | L'argent part chez le fournisseur, **bloqué jusqu'à la livraison** (règle 7) |
| 6 | **À la date, le montant n'est pas atteint** | Le membre a 7 jours pour compléter. Sinon, **l'argent lui est rendu**, moins les frais et ses pénalités, et le projet est clos |
| 7 | **La livraison** | Au moment de la remise, le membre donne au fournisseur **un code de livraison** affiché dans son application. Le fournisseur le saisit : **l'argent lui est versé**. Sans code, pas de paiement. **Sans code après 30 jours, l'argent est rendu au membre**, moins les frais |
| 8 | Sortie avant la date | Comme le mode Épargne : moins 2 %, moins les frais |
| 9 | Le fournisseur disparaît ou ferme avant la livraison | Pas de code, donc pas de paiement : la règle 7 rend l'argent au membre au bout de 30 jours |
| 10 | Frais | **3 % pour le membre**, prélevés quand l'argent part chez le fournisseur ou est rendu ; **1 % d'encaissement pour le fournisseur**, comme pour tout commerçant SwimPay |
| 11 | Décès | Le projet est clos ; ce qu'il a versé, moins les frais, est versé sur son compte SwimPay |

### 3.3 Pourquoi le code de livraison

Sans lui, il faudrait un humain pour trancher « le vendeur dit qu'il a livré, le
client dit que non ». Avec lui, **la preuve est le code** : le fournisseur n'est payé
que s'il a remis l'achat en main propre. Aucun litige à arbitrer, et le fournisseur
a intérêt à livrer vite.

**La limite, dite franchement** : un client de mauvaise foi peut refuser de donner
le code après avoir reçu l'achat. Le fournisseur se protège en ne remettant l'achat
que contre le code, comme on remet un colis contre signature.

### 3.4 Ce que le mode Projet rapporte en plus

Chaque projet amène **un commerçant** chez SwimPay : l'école, le vendeur de moutons,
le couturier. Ce commerçant encaisse ensuite d'autres clients avec SwimPay. C'est
une porte d'entrée vers le côté commerçant (`22_LES_ZONES.md`).

---

## 4. Ce qui reste à vérifier

- [ ] **La qualification juridique** : un argent bloqué jusqu'à une date ressemble à
      de la collecte d'épargne. Même question que pour la tontine classique, à
      poser au partenaire EME et à un avocat `[H]`.
- [ ] Le repère des ~3 % du collecteur de tontine, à sourcer `[H]`.
- [ ] Les critères de vérification d'un commerçant pour le mode Projet.
