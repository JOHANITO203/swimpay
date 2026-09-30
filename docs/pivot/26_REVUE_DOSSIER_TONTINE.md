# Revue du dossier de conception « Module Tontine » (DeepSeek)

> Revue demandée par LO le 29 septembre 2026, sur le dossier
> `design/prototype/# 📘 DOSSIER DE CONCEPTION.md` (version 1.0), produit avec
> DeepSeek. Elle suit le format demandé par le dossier (§10.3), vérifie ses faits
> en source, et le croise avec `24_TONTINE_EVENEMENT.md`, `25_TONTINE_CATALOGUE.md`
> et le simulateur `design/pivot/sondes/tontine-scenarios.py`.

---

## 1. Verdict

**Architecture à revoir, pas à repenser.** Le raisonnement de fond est juste, et
rejoint le nôtre sur l'essentiel : la tontine est un crédit déguisé, le risque
naît du décalage dans le temps, le tirage doit être prouvé, le risque doit être porté
collectivement. Mais :

- **sa recherche de marché contient des erreurs**, et deux de ses sept « lois »
  reposent dessus ;
- **deux piliers ont une faille qui les rend inopérants** contre un fraudeur : la
  zone « enfermée » et la gouvernance par vote ;
- **deux décisions contredisent des choix déjà tranchés par LO** : le tirage
  négocié en mode fermé, et la part de la cagnotte de sortie prise par SwimPay ;
- **l'ensemble est trop complexe** pour un utilisateur non bancarisé (4 caisses ×
  3 zones × 7 sanctions × 2 modes × votes).

---

## 2. Les faits vérifiés, un par un

| Affirmation du dossier | Vérification | Verdict |
|---|---|---|
| Ollo Africa : capital porté de 68 M à 1 Md FCFA, ~5 000 comptes familiaux, partenariats Ecobank et UCRM | Confirmé : Financial Afrik (3 février 2026), Togo First (28 septembre 2026). Agréé **établissement de paiement** en septembre 2025 | ✅ Exact. Nuance : agrément d'établissement de paiement, pas un agrément « sur le segment tontine » |
| SUSU en liquidation judiciaire en 2026 | Confirmé : SUSU France SAS, date de cessation des paiements le 20 avril 2026 | ✅ Exact, **mais SUSU est une assurance santé** pour la diaspora, pas une tontine. La « leçon » (holding offshore) est une interprétation. Les montants de pertes cités ne sont pas vérifiés |
| TontineTrust : « échec technologique » d'une tontine sur blockchain | TontineTrust est une **retraite viagère** (le sens ancien du mot « tontine » : les parts des décédés passent aux survivants), toujours active, qui lance de nouveaux produits | ❌ **Faux.** Ce n'est ni une tontine tournante, ni un échec. La « loi 2 » ne peut pas s'appuyer dessus |
| MaTontine : échec réglementaire, 13 362 téléchargements pour 4 107 échanges | Le partenariat MaTontine–COFINA existe ; son objectif affiché était 57 000 clientes et 40 000 prêts d'ici 2022. **Les chiffres cités et la cause d'échec sont introuvables** | ⚠️ Non vérifié |
| Fundu : 13 362 téléchargements, commercialisé comme distributeur sans licence | Introuvable. **Le même chiffre de 13 362 est attribué à MaTontine** : signe d'un mélange ou d'une invention | ❌ À retirer tant qu'une source n'est pas trouvée |
| Money Fellows : 8,5 millions d'utilisateurs | Les sources donnent **8 millions de téléchargements** et **1 million de clients**, 350 000 actifs par mois | ⚠️ Gonflé : téléchargements confondus avec utilisateurs |
| Money Fellows : 1,5 Md $, rentable, 7 à 8 % des places financées | Confirmé (`23_LA_TONTINE.md` §1.2) | ✅ Exact |

**Conséquence** : les lois 1, 3, 4, 5 et 7 tiennent. **La loi 2** (« la culture
avant la tech ») reste un bon principe, mais son exemple est faux. **La loi 6**
(« l'argent reste dans l'écosystème ») s'appuie sur Fundu, introuvable.

---

## 3. Points forts

1. **L'asymétrie temporelle** (§2) est parfaitement posée, et le tableau est
   juste : le gagnant du tour 1 détient une créance non garantie sur les autres.
2. **Le tirage** (§3.5) : empreinte publiée avant, entropie collective des membres
   connectés, révélation vérifiable, registre en ajout seul. **C'est exactement
   notre module 4**, trouvé indépendamment : bon signe.
3. **Le portage collectif en trois niveaux**, financé par les frais : cohérent avec
   Money Fellows et avec notre Filet.
4. **La distinction « déjà reçu / pas encore reçu »** pour le défaut et le
   remplacement (§3.4) : c'est la bonne ligne de partage.
5. **La procédure de décès** cadrée (certificat, sept jours, trois cas).
6. **La question de la faillite de SwimPay** (Q6) : elle est rarement posée, et
   elle est essentielle.
7. **Les deux modes, Globale et Fermée** : un vrai levier d'acquisition (entrer
   entre inconnus) et de confort (entre proches).
8. **Le score comme actif transférable** : notre passeport de régularité, validé
   par Esusu et Exuus.

---

## 4. Points faibles

### 4.1 Le pré-blocage « tour 1 : ~90 000 » annule la tontine

Le pilier 1 fait bloquer au gagnant du tour 1 l'équivalent de tout ce qu'il doit
encore. Notre simulation l'a mesuré (`25_TONTINE_CATALOGUE.md` §4.2) : **à ce niveau
de blocage, le gagnant touche exactement ce qu'il a déjà engagé. Son avance vaut
zéro.** La tontine devient une épargne. Et la condition d'éligibilité proposée par
LO dans le dossier (« avoir 100 000 F gelés » pour une tontine de 100 000 F) demande
au membre d'avoir déjà la somme qu'il cherche à obtenir.

Ce n'est pas une erreur en soi, c'est **un choix à assumer** : pour un inconnu,
c'est la seule configuration sans risque (notre nouveau membre). Mais le dossier
présente ce pré-blocage comme une protection d'un crédit, alors qu'il **supprime le
crédit**. Le crédit ne revient que pour des membres de confiance, avec un fonds de
garantie dimensionné : c'est ce que notre catalogue règle par les niveaux.

### 4.2 La zone « enfermée » ne retient pas un fraudeur

L'idée psychologique est bonne : l'utilisateur voit son argent et peut l'utiliser.
Mais **si l'argent enfermé peut circuler vers d'autres comptes SwimPay, le fraudeur
l'envoie à un complice, qui le retire.** Et s'il peut payer des commerçants, un faux
commerçant complice fait la même chose. Pour un fraudeur, la zone enfermée est une
zone libre avec une étape de plus.

Elle ne garantit que si ses usages sont **non convertibles en espèces** : payer une
facture d'électricité, un abonnement, une école désignée. Sinon, elle doit être
traitée comme libre dans le calcul du risque.

### 4.3 L'intérêt sur les fonds bloqués (1 à 2 % par an)

- **Qui le paie ?** Le dossier ne le dit pas. Les fonds sont cantonnés à 100 %
  (`03_RESEARCH_COMPLETE.md` §1.4) ; SwimPay ne peut pas les prêter pour produire un
  rendement.
- **Est-ce permis ?** À vérifier auprès du partenaire EME : rémunérer un solde de
  monnaie électronique n'est pas acquis. Djamo ne rémunère son épargne que grâce à un
  agrément de microfinance (`04_PROBLEM_MAP.md`).

À retirer de la V1.

### 4.4 La cagnotte de sortie : SwimPay se paierait sur l'argent des membres

Le fonds d'entretien est présenté comme restituable, puis la cagnotte de sortie en
donne **30 % à SwimPay**. C'est contradictoire, et risqué :

- cet argent appartient aux membres, et il est cantonné à leur nom ;
- SwimPay gagnerait **davantage quand il n'y a pas de défaut**, puisque le fonds reste
  plein : son intérêt ne serait plus aligné sur la protection des membres.

**SwimPay se rémunère par ses frais, jamais sur les garanties.** Le fonds non utilisé
revient aux membres, c'est aussi ce qui rend le fonds indolore (`25` §4.2).

### 4.5 Le tirage négocié en mode Fermé contredit la règle de LO

LO a tranché : **le pur hasard**, devant les membres connectés, définitif. Le mode
Fermé qui permet un ordre négocié rouvre l'arnaque classique : l'organisateur
« négocie » sa place en premier.

Et le dossier donne au mode Fermé une **garantie plus faible**, au motif de la
confiance entre proches. Or la plupart des arnaques de tontine réelles se font
**entre gens qui se connaissent** : c'est la confiance qui rend l'arnaque possible.
**La garantie doit dépendre du niveau de chaque membre, pas du mode.**

### 4.6 La gouvernance par vote est un vecteur d'attaque

« Les bons membres gouvernent » : une bande majoritaire vote l'exclusion d'un
honnête, ou un changement de règle. C'est incompatible avec le **Pacte figé au
tirage** (module 3 de `24`). Les votes, s'il en faut, ne portent que sur des sujets
qui ne touchent **ni l'argent, ni l'ordre, ni les règles**.

### 4.7 Le remplacement d'un défaillant : la règle mathématique manque

Un remplaçant qui arrive en cours de cycle n'a pas payé les tours passés. Si on le
met à la place du défaillant, il touche un pot auquel il n'a pas contribué. Il faut
une règle : **le remplaçant paie d'abord les cotisations déjà échues**, ou bien il
prend **la dernière place**.

### 4.8 La plainte à la PLCC pour un défaut de paiement

La PLCC est la plateforme de lutte contre la cybercriminalité. Un membre qui ne paie
plus a une **dette civile** : le recours passe par le recouvrement et le juge civil.
La PLCC convient à la **fraude** (fausse identité, comptes multiples, collusion
organisée). Le dossier mélange les deux.

### 4.9 Trop de mécanismes

4 caisses × 3 zones × 7 niveaux de sanction × 2 modes × votes × garant tiers :
chaque combinaison est un cas à tester et à expliquer à un utilisateur non bancarisé.
Voir les simplifications du §6.

---

## 5. Angles morts détectés

| # | Angle mort | Ce qu'il faut |
|---|---|---|
| 1 | **La fuite de la zone enfermée** vers un complice (§4.2) | Usages non convertibles seulement, ou zone traitée comme libre |
| 2 | **La bande majoritaire** qui prend le contrôle par le vote (§4.6) | Pas de vote sur l'argent, l'ordre ou les règles |
| 3 | **Le plafond de monnaie électronique** : 2 000 000 F de solde, 10 000 000 F de recharges par mois, 200 000 F pour un non-identifié `[V]` | Absent du dossier. Prises plafonnées, ou versées sur la banque |
| 4 | **Le remplaçant qui touche sans avoir payé** (§4.7) | Arriérés payés d'abord, ou dernière place |
| 5 | **Le garant complice ou insolvable** | Accord écrit du garant, preuve de ses fonds, et ses fonds bloqués eux aussi. Sinon, pas de garant en V1 |
| 6 | **La recharge par carte annulée après coup** (le dossier le cite, sans réponse) | Un argent rechargé par carte n'entre pas dans une tontine avant un délai de sécurité. Les recharges Mobile Money, elles, sont définitives |
| 7 | **Le fondateur de la tontine qui la remplit de ses propres comptes** en mode Global | Une pièce d'identité = une place ; signaux de lien entre comptes (module 1 de `24`) |
| 8 | **Le défaut de SwimPay lui-même** (Q6) | **Déjà résolu dans notre modèle** : les fonds sont chez le partenaire EME, sur un compte dédié, hors du bilan de SwimPay. À vérifier dans le contrat EME |
| 9 | **Les tailles impossibles** : le dossier propose « 5 à 20 membres » sans règle | Notre règle N = B × T, avec B ∈ {1, 2, 3} (`25` §1) : certaines tailles sont refusées |
| 10 | **La pression sur les derniers de la liste** (citée, sans réponse) | Prises protégées, et prime de patience pour que la fin de liste ne soit pas une perte (`23` §13) |

---

## 6. Les trois changements à faire avant de coder

1. **Retirer ce qui ne tient pas** : l'intérêt sur les fonds bloqués, la part de
   SwimPay dans la cagnotte de sortie, le tirage négocié, les votes sur l'argent et
   les règles. SwimPay se paie par ses frais, point.
2. **Remplacer les trois zones par deux** : *libre* et *bloquée*. La zone enfermée
   n'est gardée que si ses usages sont non convertibles en espèces.
3. **Adopter le catalogue éprouvé** (`25`) : formats fermés, règles N = B × T,
   niveaux de confiance, et une retenue calculée par le moteur plutôt qu'un
   pré-blocage uniforme. Le mode Global et le mode Fermé deviennent un simple
   réglage de recrutement ; **la garantie suit le niveau de chaque membre, pas le
   mode.**

## 7. Les trois choses à approfondir avant de lancer

1. **La qualification réglementaire**, avec le partenaire EME : un argent bloqué
   pour le compte d'un groupe est-il de la monnaie électronique, ou de la collecte
   d'épargne ? Et la position exacte de SwimPay : distributeur, ou opérateur
   technique ?
2. **Le recouvrement réel** : que peut-on faire, juridiquement et pratiquement,
   contre un défaillant identifié, et à quel coût ?
3. **Le test terrain des noms et des mécanismes** : un utilisateur non bancarisé
   comprend-il la retenue, le fonds rendu, le tirage prouvé, en moins d'une minute ?

## 8. Les trois risques à surveiller en permanence

1. **Les bandes** : groupes de comptes liés qui entrent ensemble et touchent tôt.
2. **Le taux de recours au fonds** et à SwimPay, format par format, comparé à ce que
   le simulateur a prévu.
3. **La conformité** : plafonds de monnaie électronique, identification, schémas de
   blanchiment.

---

## 9. Questions à clarifier par LO

- [ ] Garde-t-on le **mode Fermé** ? Si oui, avec le **même tirage au hasard** et la
      **même garantie par niveau** que le mode Global ?
- [ ] La **zone enfermée** : on la retire, ou on la limite à des usages non
      convertibles (factures, écoles, abonnements) ?
- [ ] Le **garant tiers** : en V1 ou plus tard ?
- [ ] La **caisse de solidarité** (décès, maladie) : en V1 ou plus tard ?
- [ ] La **gouvernance** : on retire les votes, ou on les limite à ce qui ne touche ni
      l'argent, ni l'ordre, ni les règles ?

---

## Sources

- Financial Afrik, *Ollo Africa porte son capital de 68 millions à 1 milliard de FCFA* (3 février 2026) — https://www.financialafrik.com/2026/02/03/togo-la-fintech-ollo-africa-porte-son-capital-de-68-millions-a-1-milliard-de-fcfa/
- Togo First, *Ohana Africa et Ecobank lancent le Compte familial* — https://www.togofirst.com/fr/finance/2809-20187-epargne-digitale-ohana-africa-et-ecobank-lancent-le-compte-familial-au-togo
- allAfrica, *Ollo Africa digitalise les tontines* — https://fr.allafrica.com/stories/202602070153.html
- RubyPayeur, *SUSU France SAS* (liquidation) — https://rubypayeur.com/societe/susu-france-sas-848010286
- We Are Tech, *Bola Bardet et Susu* — https://www.wearetech.africa/fr/fils/tech-stars/la-franco-beninoise-bola-bardet-veut-faire-de-susu-une-solution-qui-revolutionne-la-sante-en-afrique-francophone
- Dealroom, *TontineTrust* — https://app.dealroom.co/companies/tontinetrust
- CardRates, *TontineTrust Lifetime Income Pensions* — https://www.cardrates.com/news/tontinetrust-aims-to-deliver-increasing-pension-payouts/
- MFW4A, *COFINA Senegal partners with MaTontine* — https://www.mfw4a.org/news/cofina-senegal-partners-matontine-expand-financial-access-low-income-women
- GSMA, *MaTontine* — https://www.gsma.com/mobilefordevelopment/digital-grantees-portfolio/matontine/
- Money Fellows et Launch Base Africa : voir `23_LA_TONTINE.md`, sources.
