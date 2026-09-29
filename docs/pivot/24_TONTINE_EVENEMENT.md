# La tontine-événement — protéger les membres les uns des autres

> Écrit le 29 septembre 2026, sur la consigne de LO : **ne plus parler de salaire**,
> penser la tontine pour **l'utilisateur SwimPay ordinaire**, comme un
> **événement**, et construire un système **en modules robustes qui voit tous les
> angles morts** de la tontine. Les formules épargne et projet viendront ensuite,
> chacune avec son propre système.
>
> Ce document **remplace** `23_LA_TONTINE.md` §13 pour la tontine tournante. Le 23
> reste valable pour la recherche (§1) et les formules (§3).
>
> `[H]` = proposition à valider. **Rien n'est codé.**

---

## 1. L'événement, tel que LO le décrit

> Un utilisateur organise une tontine de **10 000 F par tour**, **5 tours dans la
> semaine** (5 jours), et cherche **9 membres**, pour un total de **10**. Les
> participants acceptent, passent un **test d'éligibilité**, puis la **liste de
> passage est tirée au pur hasard devant les membres connectés**, présentée **une
> fois pour toutes**, sans retour possible. Ensuite, les membres sont soumis aux
> règles d'**arbitrage** de SwimPay qui évitent l'arnaque classique, et chaque tour
> est **facturé par SwimPay** pour l'arbitrage et la protection des fonds.

**Lecture chiffrée** (à confirmer par LO) : 10 membres et 5 tours, donc **2 gagnants
par tour**. Chaque tour collecte 100 000 F ; chaque gagnant reçoit **50 000 F**, ce
que chacun aura cotisé au total sur la semaine. La règle générale : *N* membres,
*T* tours, *N / T* gagnants par tour (*T* doit diviser *N*).

---

## 2. Le cycle de vie de l'événement

Une machine à états, chaque transition journalisée :

```
Brouillon → Recrutement → Éligibilité → Tirage → Figé → Tour 1 … Tour T → Clôture
                 │              │            │
                 └──── Annulé (avant le tirage : tout est rendu) ────┘
                                      En cours ──→ Incident (défaut, litige)
```

| État | Ce qui s'y passe | Ce qui est impossible |
|---|---|---|
| **Brouillon** | L'organisateur fixe montant, nombre de tours, rythme, nombre de membres, objectif | Rien n'est engagé |
| **Recrutement** | Invitations (répertoire, lien WhatsApp) ; chaque invité accepte le Pacte | L'organisateur ne peut plus changer les règles une fois le premier membre entré |
| **Éligibilité** | Le test de chaque membre (module 2) ; **caution et première cotisation bloquées** | Un membre non éligible ne peut pas rester |
| **Tirage** | La cérémonie en direct (module 4) | Personne, pas même SwimPay, ne peut choisir l'ordre |
| **Figé** | L'ordre de passage est publié, **définitif** | **Aucun retour en arrière** : ni l'ordre, ni les membres, ni les montants |
| **Tour *k*** | Cotisations bloquées, gagnants payés, retenues appliquées | Retirer l'argent bloqué |
| **Clôture** | Cautions et fonds de garantie non utilisés rendus, attestations émises | — |
| **Annulé** | Seulement **avant le tirage** : tout ce qui a été bloqué est rendu | Annuler après le tirage |

---

## 3. Les angles morts : qui peut arnaquer qui

On se met à la place de chaque acteur malveillant.

| # | L'arnaque | Qui la commet | Ce qu'elle coûte, sans protection |
|---|---|---|---|
| A1 | **Toucher tôt, puis disparaître** | Un membre | Les derniers ne sont jamais payés. **L'arnaque classique** |
| A2 | **Garder la caisse** | L'organisateur | Tout le monde perd tout |
| A3 | **Truquer l'ordre** : se placer en premier, ou y placer ses complices | L'organisateur | A1, en mieux organisé |
| A4 | **Remplir avec de faux comptes** : une seule personne occupe plusieurs places | Un membre ou l'organisateur | Plusieurs A1 d'un coup |
| A5 | **La bande** : plusieurs complices rejoignent la tontine d'un honnête, touchent et partent | Un groupe | L'honnête paie pour tous |
| A6 | **Changer les règles en route** : montant, ordre, membres | L'organisateur | Plus rien ne tient |
| A7 | **Se désister après le tirage**, une fois l'ordre connu défavorable | Un membre | Le tour manque de cotisations |
| A8 | **Payer en retard, ou en partie** | Un membre | Le gagnant du tour reçoit moins, ou plus tard |
| A9 | **« J'ai payé »** : contester une dette réelle | Un membre | Disputes, groupe détruit |
| A10 | **Voler un compte** pour détourner le pot à son tour | Un tiers | Le vrai membre ne reçoit rien |
| A11 | **Harceler, exposer** les membres (numéros, montants) | Un membre | Atteinte à la vie privée, pression |
| A12 | **Défaut de bonne foi** : maladie, décès, perte d'argent | Personne n'est coupable | Même effet que A1 |
| A13 | **Blanchir** de l'argent par des tontines fictives | Un groupe | Risque réglementaire pour SwimPay |
| A14 | **Dépasser le plafond** de monnaie électronique avec un gros pot | Personne | Pot bloqué, versement impossible |
| A15 | **L'organisateur disparaît** en plein cycle | L'organisateur | Plus personne pour piloter |

---

## 4. Les modules

Chaque module ferme un ou plusieurs angles morts. Aucun ne suffit seul ; ensemble,
ils ne laissent aucune arnaque rentable.

### Module 1 — **L'identité unique** (A4, A5, A10, A13)

- **Une pièce d'identité = une personne = une place** par tontine. Deux comptes
  avec la même pièce ne peuvent pas entrer dans le même événement.
- **Les signaux de lien** entre comptes (même appareil, mêmes sources de recharge,
  comptes créés ensemble) sont repérés : une tontine où plusieurs membres sont liés
  à l'organisateur est **signalée** avant le tirage.
- Un **compte trop récent** ne peut rejoindre qu'un nombre limité d'événements `[H]`.

### Module 2 — **Le test d'éligibilité** (A1, A4, A5)

À l'acceptation, chaque membre passe un test **automatique**, sans jugement humain :

1. **La pièce d'identité**, vérifiée.
2. **La preuve des fonds** : la **caution** (une cotisation) et la **première
   cotisation** sont **bloquées immédiatement**. Qui ne peut pas les bloquer n'entre
   pas. C'est la preuve la plus sûre : l'argent existe, il est là.
3. **La capacité à tenir** : des entrées sur le compte, sur les dernières semaines,
   au moins égales à l'engagement total de l'événement `[H]`.
4. **L'historique** : tontines terminées sans incident, retards passés, défauts.
5. **Les limites** : un nombre maximal d'événements en cours `[H]`, et des
   engagements totaux proportionnés aux entrées.

Le résultat est un **niveau de confiance** (nouveau, confirmé…), qui pèse ensuite sur
la retenue (module 6), pas sur l'ordre de passage : l'ordre, lui, reste au pur
hasard.

### Module 3 — **Le Pacte figé** (A6, A7, A15)

- Avant le tirage, chaque membre **signe le Pacte** avec son code secret : montant,
  nombre de tours, rythme, objectif, caution, retenue, frais, sanctions.
- **Au tirage, tout se fige.** Plus aucune modification, par personne.
- **L'organisateur n'a aucun pouvoir sur l'argent**, ni après le tirage aucun pouvoir
  sur les règles : s'il disparaît (A15), l'événement continue seul.
- **Se désister après le tirage** (A7) ne rend pas l'argent : la caution et les
  cotisations bloquées restent engagées jusqu'à la fin, selon le Pacte.

### Module 4 — **Le tirage public** (A3)

La cérémonie, **devant les membres connectés** :

1. Chaque membre connecté **touche l'écran** : son geste produit un nombre au hasard.
2. SwimPay combine **tous ces nombres**, plus le sien, publié à l'avance sous forme
   d'empreinte. **Personne ne peut prévoir ni imposer le résultat**, pas même
   SwimPay, puisque le résultat dépend du geste de chaque membre.
3. L'ordre s'affiche en direct, pour tout le monde en même temps.
4. N'importe quel membre peut **vérifier après coup** que l'ordre découle bien des
   nombres publiés.

C'est la réponse à A3, et **l'élément original** : le hasard est produit par le
groupe lui-même, et il se prouve.

### Module 5 — **Le coffre de l'événement** (A2, A8)

- Tout l'argent de l'événement vit dans une **enveloppe verrouillée**, chez le
  partenaire émetteur agréé. **L'organisateur ne détient jamais un franc.**
- À chaque échéance, la cotisation est **bloquée automatiquement** sur le solde du
  membre. Pour un rythme quotidien (l'exemple de LO), l'échéance tombe chaque jour à
  heure fixe.
- **Une cotisation se paie entière** : pas de paiement partiel (A8).

### Module 6 — **La prise protégée, calculée** (A1, A5)

Le gagnant reçoit sa prise **moins une retenue**, et **la retenue paie
automatiquement ses cotisations restantes** (« prélevé après la prise », décision de
LO).

**La retenue n'est pas un taux fixe.** Le moteur la calcule gagnant par gagnant, pour
que **le risque à découvert** (ce que ni la retenue ni la caution ne couvrent) **ne
dépasse jamais ce que le filet peut payer** (module 7). C'est ce qui rend le système
robuste face à une bande (A5) : plus il y a de gagnants exposés, plus chacune de leurs
retenues monte.

**Sur l'exemple de LO**, avec une caution d'une cotisation (10 000 F) :

| Tiré le jour | Nouveau (retenue 80 %) : reçoit | risque à découvert | Confirmé (retenue 40 %) : reçoit | risque à découvert |
|---|---|---|---|---|
| 1 | 18 000 F | 0 F | 34 000 F | 14 000 F |
| 2 | 26 000 F | 0 F | 38 000 F | 8 000 F |
| 3 | 34 000 F | 0 F | 42 000 F | 2 000 F |
| 4 | 42 000 F | 0 F | 46 000 F | 0 F |
| 5 | 50 000 F | 0 F | 50 000 F | 0 F |

> **Précisé par `25_TONTINE_CATALOGUE.md`** : les taux de 80 % et 40 % ci-dessous
> étaient une première approche. Le moteur éprouvé fixe la retenue par niveau
> (Pousse, Tronc, Baobab) et par format, d'après le pire scénario simulé.

Ce que dit ce tableau :

- **Un nouveau venu ne fait courir aucun risque au groupe**, à aucun jour : on peut
  accueillir des inconnus.
- **Un confirmé tiré le jour 1 laisse 14 000 F à découvert**, alors qu'un fonds de
  garantie à 1 % ne réunit que 5 000 F sur l'événement. Avec des taux fixes, il faut
  donc soit une caution plus haute pour les premiers tirés, soit une garantie de
  SwimPay en dernier recours. **Le moteur choisit tout seul** la retenue qui ramène
  le découvert sous la capacité du filet.

### Module 7 — **Le filet** (A1, A12)

Dans l'ordre, si une cotisation manque au terme du délai de grâce :

1. la **retenue** du défaillant, puis sa **caution** ;
2. le **fonds de garantie** de l'événement (une part des frais de chaque tour) ;
3. **SwimPay en dernier recours**, si LO le décide : c'est ce que fait Money
   Fellows, pour moins de 8 % de ses places (`23_LA_TONTINE.md` §1.2).

**Le gagnant du tour reçoit toujours sa prise complète.** C'est la promesse du
produit.

Pour le **défaut de bonne foi** (A12), le Pacte prévoit à l'avance ce qui se passe en
cas de décès ou d'incapacité : la place peut être reprise par un proche désigné, ou
le membre est remboursé de ce qu'il a versé, moins ce qu'il a reçu.

### Module 8 — **Le recouvrement** (A1, A8)

- **Délai de grâce** court, adapté au rythme : quelques heures pour un tour
  quotidien `[H]`.
- **Pénalité de retard** fixe, prévue au Pacte.
- Passé le délai : saisie (module 7), **exclusion des futurs événements**, et le
  Pacte signé avec pièce d'identité permet le **recouvrement**.
- Le défaillant **sait tout cela avant d'entrer** : c'est la dissuasion.

### Module 9 — **Le journal et les litiges** (A9)

- Chaque mouvement est inscrit, horodaté, **impossible à modifier**, et visible par
  tous les membres : qui a payé, quand, qui a reçu, combien a été retenu, ce que le
  fonds a couvert.
- « J'ai payé » se vérifie en une seconde : le journal fait foi.
- Un litige ouvre une procédure d'**arbitrage SwimPay**, avec le journal comme
  preuve.

### Module 10 — **La protection du compte** (A10)

- La prise n'est versée que **sur le compte SwimPay du gagnant**, jamais ailleurs.
- Retirer ensuite vers un compte externe **nouvellement ajouté** demande le code
  secret, la biométrie, et un délai de sécurité `[H]`.

### Module 11 — **La vie privée entre membres** (A11)

- Les membres se voient par leur **pseudonyme** ; les numéros restent **masqués**.
- On voit l'**état** de chaque membre (à jour, en retard), jamais son solde.
- Signalement et exclusion en cas de harcèlement.

### Module 12 — **La conformité** (A13, A14)

- **Montants plafonnés** par événement et par membre `[H]`.
- **Le plafond de 2 000 000 F** de solde en monnaie électronique `[V]` : une prise
  qui le ferait dépasser est versée **sur la banque** du gagnant.
- **Pièce d'identité obligatoire**, qui place tous les membres parmi les porteurs
  identifiés.
- Des alertes sur les schémas atypiques : mêmes membres qui tournent en boucle,
  montants ronds répétés entre comptes liés.
- **Question à poser au partenaire EME** : un argent bloqué pour le compte d'un
  groupe relève-t-il de la monnaie électronique, ou de la collecte d'épargne ?

### Module 13 — **La facturation** (décision de LO)

Chaque tour est **facturé par SwimPay** pour l'arbitrage et la protection des fonds.
Proposition `[H]` : **1 % du tour**, soit **1 000 F par tour et 5 000 F par
événement** sur l'exemple de LO.

**Question à trancher** : qui paie ? Trois options, du plus simple au plus juste :

- tous les membres, à parts égales, à chaque tour (100 F par membre et par tour) ;
- les gagnants du tour, sur leur prise ;
- en proportion de l'avance reçue : celui qui touche tôt paie plus, puisque c'est lui
  que le système protège le plus.

---

## 5. La matrice : chaque arnaque, et ce qui l'arrête

| Arnaque | Modules qui la ferment |
|---|---|
| A1 Toucher et disparaître | 2 (preuve des fonds), 6 (retenue calculée), 7 (filet), 8 (recouvrement) |
| A2 Garder la caisse | 5 (coffre : l'organisateur ne détient rien) |
| A3 Truquer l'ordre | 4 (tirage produit par le groupe, vérifiable) |
| A4 Faux comptes | 1 (une pièce = une place), 2 |
| A5 La bande | 1 (signaux de lien), 6 (le moteur monte les retenues), 7 |
| A6 Changer les règles | 3 (Pacte figé au tirage) |
| A7 Se désister après le tirage | 3 (l'argent bloqué reste engagé) |
| A8 Payer en retard ou en partie | 5 (prélèvement entier et automatique), 8 |
| A9 « J'ai payé » | 9 (journal immuable) |
| A10 Voler un compte | 10 (prise sur le compte du gagnant, retraits protégés) |
| A11 Harceler, exposer | 11 (pseudonymes, numéros masqués) |
| A12 Défaut de bonne foi | 7 (filet), 3 (clauses prévues au Pacte) |
| A13 Blanchir | 1, 12 |
| A14 Dépasser le plafond | 12 (versement sur la banque) |
| A15 Organisateur disparu | 3 (l'événement tourne seul) |

---

## 6. Pourquoi c'est attractif, et pas seulement sûr

- **Le tirage devient un moment** : un événement en direct, où chaque membre
  participe au hasard par son propre geste.
- **Entrer entre inconnus devient possible** : c'est ce qu'aucune tontine
  traditionnelle ne permet, puisqu'elle repose sur la confiance personnelle. Ici, la
  confiance est portée par le système.
- **La promesse est simple** : *le gagnant du tour reçoit toujours sa prise
  complète.*
- **Chaque événement terminé construit une réputation** que le membre emporte avec
  lui : c'est la traçabilité et l'exportabilité voulues par LO.

---

## 7. Ce qu'il reste à trancher

- [ ] **La lecture de l'exemple** : 10 membres et 5 tours, soit 2 gagnants par tour
      qui reçoivent 50 000 F chacun ?
- [ ] **Qui paie les frais** de chaque tour, et leur taux.
- [ ] **SwimPay en garant de dernier recours**, ou filet porté par les membres seuls.
- [ ] Les **seuils** du test d'éligibilité et les **plafonds** d'un événement.
- [ ] **La qualification réglementaire**, auprès du partenaire EME.

Ensuite : les systèmes propres à l'**épargne** et au **projet**, puis les scénarios,
puis la fonctionnalité dans l'app, sur le site et dans la documentation.
