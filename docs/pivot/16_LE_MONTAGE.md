# Le montage — où est la marge, et par où passe l'argent

> Trois questions de LO, le 29 août 2026 au soir : que rapporte-t-on si on passe
> par des rails ? peut-on passer par la crypto ? peut-on composer un montage
> avec les comptes marchands des opérateurs ?
>
> Réponses courtes : **sur le flux, presque rien ; non ; oui, et c'est la bonne
> piste.**

---

## 1. Ce que rapporte un rail — l'arithmétique, sans adoucissement

Grilles vérifiées (`09`, `10`) contre nos prix publiés (`06` §8).

### 1.1 Encaisser

| Route | Ce que ça nous coûte | Ce qu'on vend | **Reste** |
|---|---|---|---|
| PayDunya, Mobile Money CI | **2,25 %** | 1 % | **− 1,25 point** |
| Julaya, Cash & Collect | **0,5 à 1 %** | 1 % | **0 à + 0,5 point** |
| Wave, compte marchand direct | **≈ 1 %**, payé par le marchand | 1 % | **0 — mais on ne porte rien** |
| CinetPay | 1,5 à 2 % `[T]` | 1 % | − 0,5 à − 1 point |
| Hub2 | 1,8 à 2,5 % `[T]` | 1 % | − 0,8 à − 1,5 point |

> **Sur l'encaissement, aux prix publics et à nos tarifs affichés, il n'y a pas
> de marge.** Une seule route est à l'équilibre ou légèrement positive : Julaya
> en Cash & Collect.

Ce n'est pas un échec du modèle, c'est le modèle : **le flux se vend à prix
coûtant, le logiciel se vend en abonnement.** Il faut juste cesser d'espérer que
le flux paie.

### 1.2 Verser — c'est là qu'il y a de la marge

| Route | Coût | Notre prix | Reste |
|---|---|---|---|
| Julaya, alimentation par virement bancaire | **gratuit** | — | — |
| Julaya, versement Mobile Money | **0,5 à 1,5 %** | coût + 0,3 à 0,5 % | **+ 0,3 à 0,5 point** |
| PayDunya, versement | 2,00 % | coût + 0,3 à 0,5 % | + 0,3 à 0,5 point, sur une base bien plus chère |

Sur une paie de **1 160 000 F** : alimentation gratuite + versement à 1 % =
11 600 F de coût, revendu ~15 000 F. **≈ 3 400 F de marge.** Modeste, mais
positif et récurrent tous les mois.

### 1.3 Ce que ça dit du prix de vente

Deux conclusions, et elles sont désagréables mais nettes :

1. **L'abonnement est la seule vraie source de revenu.** 10 000 F par mois et par
   PME, sans coût de rail, contre quelques centaines de francs de marge sur le
   flux. Sur 400 PME : **4 M F par mois d'abonnement**, contre peut-être
   200 à 400 k F de marge sur le flux.
2. **Vendre l'encaissement à 1 % nous met en perte sur trois routes sur cinq.**
   Soit on prend la route la moins chère, soit on remonte le prix, soit on
   assume l'encaissement comme un produit d'appel financé par l'abonnement — ce
   que `06` §8 disait déjà (« prix coûtant »), mais sans savoir que le coût
   dépassait le prix.

---

## 2. La crypto — non, et pas pour la raison qu'on croit

La réponse honnête n'est pas morale, elle est arithmétique.

### 2.1 Le coût n'est pas au milieu, il est aux deux bouts

Le client du marchand a des francs CFA dans Orange Money ou Wave. Le marchand
veut des francs CFA sur son compte. Pour faire passer de la valeur par la crypto,
il faut :

1. **entrer** : convertir du mobile money en crypto — c'est un encaissement mobile
   money, donc **exactement le 1 à 2,25 % qu'on cherchait à éviter** ;
2. traverser — là, oui, c'est presque gratuit ;
3. **sortir** : reconvertir en francs et créditer un compte — un décaissement,
   donc à nouveau un coût de rail.

> **La crypto rend bon marché la seule partie du trajet qui ne nous coûte rien
> déjà.** Elle n'enlève ni l'entrée ni la sortie, et elle ajoute un écart de
> change et un risque de cours.

### 2.2 Et le cadre juridique ferme la porte pour un tiers

Convertir des francs en crypto **pour le compte d'autrui**, c'est fournir un
service de paiement au sens de l'article 4 de l'instruction BCEAO 001-01-2024.
L'article 9 est explicite : *« Nul ne peut, sans avoir été préalablement agréé
[…] fournir les services de paiement visés aux points i) à vii). »* Sans
agrément, on ne peut pas le faire pour nos marchands.

### 2.3 Où elle marcherait vraiment

**En transfrontalier.** Déplacer de la valeur entre pays, là où la banque
correspondante est lente et chère. Ce n'est pas la V1, qui est domestique et
ivoirienne. À reprendre pour le commerce inter-UEMOA (`06` §11, terrain 4) — avec
la licence, pas avant.

---

## 3. Le montage par les comptes marchands — la bonne piste

### 3.1 L'idée, en une phrase

> **Le marchand garde ses propres comptes. L'argent ne passe jamais par nous.**

Chaque PME conserve — ou ouvre — son **compte marchand Wave Business**, sa
**puce marchande Orange Money**, son compte MTN MoMo. SwimPay est le logiciel qui,
au-dessus :

- **détecte** l'argent qui arrive sur chacun de ces comptes ;
- **rapproche** l'encaissement de la vente ;
- **émet la FNE** ;
- **ordonne** les versements depuis le compte du marchand.

### 3.2 Pourquoi c'est le meilleur montage

| | Agrégateur | **Comptes marchands** |
|---|---|---|
| Qui détient l'argent | l'agrégateur | **le marchand lui-même** |
| Notre coût par franc | 1,8 à 2,25 % | **0** |
| Agrément nécessaire | agent (art. 38) | **aucun** |
| Capital réglementaire | 0 en agent, 100 M en propre | **0** |
| Risque de flottant | oui | **aucun** |
| On montre nos clients à | un concurrent possible | **personne** |
| Notre revenu | marge sur le flux (négative) | **abonnement, intégral** |

**Le marchand paie déjà sa commission à Wave ou à Orange.** On ne s'ajoute pas à
cette facture : on vend le logiciel par-dessus. C'est exactement le contraire du
modèle agrégateur, où l'on empile une marge sur une marge.

### 3.3 Ce qui rend le montage réalisable — la trouvaille du soir

**L'API Orange Money est ouverte aux développeurs et aux ESN, sans agrégateur**
`[V]` — page officielle Orange Business CI :

- opérations : **dépôts, retraits, paiements en masse, paiements marchands** ;
- destinataires explicites : *« un agrégateur, un développeur, Entreprise de
  Services du Numérique, Société de Service et d'Ingénierie Informatique »* ;
- parcours : demande de souscription avec pièces → validation par la conformité →
  **Orange crée une puce marchande** → formation → intégration ;
- prérequis : connexion internet, **adresse IP fixe**, un système d'information ;
- **« Sans engagement ».**

Et **Wave** : compte marchand ouvert à Abidjan sur justificatif d'activité,
commission d'environ **1 %** contre 1,5 à 3 % chez les opérateurs `[T]`, avec
**QR statique et liens de paiement qui fonctionnent sans écrire une ligne de
code**. L'API n'est nécessaire que pour automatiser l'e-commerce.

**MTN MoMo** a un sandbox public et gratuit (`06` §6).

> **Trois des quatre opérateurs sont donc atteignables sans passer par
> personne.**

### 3.4 Le vrai problème du montage, et il est technique

Si l'argent arrive sur le compte du marchand, **comment le savons-nous ?**

Trois voies, par ordre de solidité :

1. **L'API de l'opérateur** — webhook ou interrogation. Disponible chez Orange
   (API marchande), à vérifier chez Wave et MTN.
2. **L'import de relevés** — le marchand dépose son relevé, on rapproche. Simple,
   sans dépendance, mais différé.
3. **La lecture des notifications sur le téléphone du marchand** — instantané,
   sans API.

> **La voie 3 est déjà construite dans ce repo.** L'application Android
> réceptrice — 25 000 lignes de Kotlin — a été écrite exactement pour ça : voir
> arriver une notification de paiement et la remonter. `00_VISION.md` §6 la
> déclare « à retirer, hors sujet ».
>
> **Avec ce montage, elle redevient le cœur du sujet.** À rouvrir avant de la
> supprimer.

### 3.5 Ce qu'il faut vérifier avant de s'engager

1. **Le tarif de la puce marchande Orange** — non publié, à demander. C'est le
   chiffre qui décide.
2. **Wave offre-t-il une API marchande à un logiciel tiers**, ou seulement QR et
   liens ? Ça décide de la voie 1 ou 3 chez le plus gros encaisseur du pays.
3. **Les plafonds des comptes marchands.** Orange limite les comptes personnels
   (3 comptes, 1,5 M sur le compte Full) ; la puce marchande obéit sûrement à
   d'autres règles, à confirmer.
4. **Moov** — non exploré du tout.
5. **Qui porte la responsabilité** si on ordonne un versement depuis le compte
   d'un marchand et qu'il part au mauvais endroit. À border contractuellement.

---

## 4. Ce que ça change pour les 400 PME

Elles ont été démarchées sur un système de paiement. Ce montage leur en donne un
— **le leur** — sans que nous ayons besoin d'une licence, d'un capital, ni d'un
partenaire qui nous voit venir.

Et il rend la négociation avec les rails **facultative au lieu d'obligatoire** :
on ne va voir PayDunya, Julaya ou Hub2 que pour ce que les comptes marchands ne
couvrent pas — typiquement le versement multi-opérateurs en masse. On y va donc
en position de choix, pas de besoin.
