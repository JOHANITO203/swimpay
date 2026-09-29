# La tontine SwimPay — le système complet

> Écrit le 29 septembre 2026, à la demande de LO : une tontine en ligne pour les
> comptes personnels, avec rotation, verrou des fonds, conditions d'éligibilité et
> revenus pour SwimPay, en évitant les erreurs des startups qui l'ont déjà tenté.
> Objectif de long terme fixé par LO : **traçabilité, exportation internationale,
> fintech de niveau mondial, et originalité.**
>
> **Fiabilité** : `[V]` source primaire, `[T]` source tierce, `[H]` hypothèse ou
> proposition, à valider. **Rien ici n'est codé.** C'est la spec à valider avant
> tout prototype (mandat : une validation par sous-projet).

---

## 1. Ce que les autres ont vécu

### 1.1 Le problème que toutes les tontines partagent `[T]`

Le membre qui a reçu le pot tôt dans le cycle **n'a plus d'intérêt à payer** ses
cotisations restantes. Celui qui touche en premier peut s'arrêter juste après :
c'est une perte pour tous les autres. Toutes les solutions sérieuses tournent
autour de ce point.

### 1.2 Les acteurs, et leurs leçons

| Acteur | Où | Ce qui marche | Ce qui a cassé, ou ce qui manque |
|---|---|---|---|
| **Money Fellows** | Égypte | **Rentable.** 1,5 Md $ traités, 8 M de téléchargements, 1 M de clients, 350 000 actifs par mois `[T]`. **Frais d'administration de 16 % pour les premiers tours, qui descendent jusqu'à 0 % pour les derniers**, répartis sur les versements jusqu'au mois où l'on touche `[T]`. Un score (emploi, factures payées, parrainage, lien avec la paie) décide **qui a droit aux premiers tours** ; un nouveau membre n'y accède pas `[T]`. Contrat signé, pénalités de retard `[T]` | Quand un cercle n'est pas complet, Money Fellows **finance lui-même la place manquante** : moins de 8 % des places actives en ont besoin `[T]`. Le risque reste mutualisé chez les membres, pas porté par l'entreprise |
| **Première vague américaine** (dont Esusu) | États-Unis | Esusu déclare chaque cotisation aux bureaux de crédit : **la tontine sert à se construire un historique** `[T]` | **Aucun revenu** : pas de frais, pas d'abonnement. Seule Esusu a survécu, en ajoutant l'épargne individuelle `[T]` |
| **E-Tontine** | Sénégal | 80 M FCFA de chiffre d'affaires en 2019, environ 3 000 membres en 2020 `[T]` | Petite échelle ; au départ, les questions de **fiabilité** revenaient sans cesse `[T]` |
| **MaTontine** | Sénégal | Cotisations par Mobile Money, puis **micro-crédit et assurance** greffés sur la tontine `[T]` | Données récentes introuvables |
| **Tonti**, **Djangui** | Abidjan, Cameroun, Sénégal, Gabon, RDC | Gestion de groupes, suivi des cotisations `[T]` | Des outils de **suivi** : l'argent ne passe pas forcément par eux |
| **Ohana Africa** (Ollo Africa) | Togo | Lancé **le 28 septembre 2026**, avec Ecobank : un « compte familial » pour cotiser à plusieurs autour d'objectifs communs. Ollo Africa est **agréé établissement de paiement** par la BCEAO `[T]` | **Concurrent direct, arrivé hier.** Orienté famille, pas rotation |

### 1.3 Un point réglementaire non vérifié

Le blog de Djangui cite une « directive BCEAO de janvier 2026 sur les services
financiers numériques communautaires » (plafond de 5 M FCFA par cycle,
cantonnement obligatoire). **Elle est introuvable sur le site de la BCEAO.** On ne
construit rien dessus tant qu'elle n'est pas trouvée en source primaire.

Ce qui est vérifié, en revanche, et qui s'applique :

- **Plafonds de la monnaie électronique** `[V]` (`03_RESEARCH_COMPLETE.md` §1.3) :
  un porteur identifié ne peut dépasser **2 000 000 F de solde** et **10 000 000 F
  de recharges par mois** ; un porteur non identifié est limité à **200 000 F par
  mois**. **Un pot de tontine versé sur le compte SwimPay compte dans ce solde.**
- **Le cantonnement** `[V]` (§1.4) : les fonds sont conservés sur un compte dédié,
  adossé à 100 %, chez le partenaire émetteur agréé.
- **À faire vérifier par le partenaire EME** : une tontine où SwimPay garde les
  cotisations jusqu'au tour relève-t-elle de la simple monnaie électronique, ou de
  la **collecte d'épargne**, réservée aux institutions de microfinance (SFD) ?

---

## 2. Les principes du système

1. **L'argent ne passe jamais par l'organisateur.** Dans la tontine
   traditionnelle, c'est lui qui peut disparaître avec la caisse. Ici, les
   cotisations vont dans une **enveloppe verrouillée** au nom de la tontine, et
   personne ne peut y toucher avant la date du tour.
2. **On traite le défaut à la source**, pas après coup : l'accès aux premiers tours
   se mérite, et celui qui touche tôt laisse une garantie.
3. **On gagne de l'argent dès le premier jour.** C'est la leçon de la première
   vague américaine.
4. **Tout est tracé et prouvable** : qui a payé quoi, quand, comment l'ordre a été
   tiré. C'est aussi ce qui rend la tontine **exportable** : un historique qu'on peut
   montrer ailleurs.

---

## 3. Les trois formules

| Formule | Principe | Pour qui |
|---|---|---|
| **Tontine tournante** | Chacun cotise à chaque échéance ; à chaque tour, un membre reçoit tout le pot | La tontine classique, entre collègues, amis, famille |
| **Tontine d'épargne** | Chacun cotise, **l'argent reste verrouillé**, et tout le monde récupère sa part à la date fixée | Épargner ensemble sans risque de défaut : personne ne touche avant les autres |
| **Tontine projet** | Une tontine d'épargne avec un **objectif** (rentrée scolaire, Tabaski, mariage), qui peut **payer directement le fournisseur** : l'école, le couturier | L'argent « fléché » de `22_LES_ZONES.md`, appliqué à la tontine |

La **tontine d'épargne** est la porte d'entrée idéale : elle n'a aucun risque de
défaut, puisque personne ne touche avant la fin. Elle construit l'historique de
régularité qui ouvrira ensuite l'accès aux tournantes.

---

## 4. La rotation : qui touche quand

L'organisateur choisit le mode à la création :

| Mode | Comment ça marche |
|---|---|
| **Tirage au sort prouvé** | L'ordre est tiré au hasard, et **chacun peut vérifier que le tirage n'a pas été truqué** : l'app publie à l'avance une empreinte du tirage, puis la révèle au démarrage (principe « engagement puis révélation »). **C'est l'élément original** : aucune tontine, traditionnelle ou numérique, ne sait prouver l'équité de son tirage `[H]` |
| **Ordre fixé par le groupe** | L'organisateur place les membres, et chacun valide l'ordre avant le démarrage |
| **Places choisies** (le modèle Money Fellows) | Chacun choisit sa place : **les premières coûtent une prime, les dernières en rapportent une** (§6.2). Le score limite l'accès aux premières places |

Dans tous les cas, **un membre dont le score est trop faible ne peut pas prendre
les premiers tours** (§5.2). C'est la règle qui protège le groupe.

---

## 5. L'éligibilité

### 5.1 Pour entrer dans une tontine

| Condition | Pourquoi |
|---|---|
| Compte SwimPay avec **pièce d'identité** | La pièce engage l'utilisateur (décision de LO du 28/09) et donne les plafonds du porteur identifié |
| **Numéro principal vérifié par SMS** | C'est lui qui identifie le membre |
| **Un nombre maximal de tontines en cours** (ex. 3) `[H]` | Éviter qu'un membre s'engage au-delà de ce qu'il peut payer |
| **Cotisations totales ≤ une part de ses entrées** (ex. 30 % des entrées mensuelles vues sur SwimPay) `[H]` | La règle d'accessibilité, mesurée sur les vrais flux, pas déclarée |
| **Le pot versé ne fait pas dépasser le plafond de 2 000 000 F** | Au-delà, le pot est versé directement sur la banque du bénéficiaire, qui n'est pas soumise à ce plafond |

### 5.2 Le score SwimPay de régularité `[H]`

Il décide l'accès aux premiers tours. Ce ne sont que des données que SwimPay voit
déjà :

- **l'ancienneté du compte** et la **pièce d'identité** ;
- **les tontines terminées** sans retard, et les tontines d'épargne menées à terme ;
- **un salaire versé par SwimPay** (le scénario paie B2B) : c'est le signal le plus
  fort, parce que la cotisation pourra être **prélevée le jour même de la paie** ;
- **la régularité des entrées** sur le compte.

Un nouveau membre commence par les **places du milieu ou de la fin**, ou par une
tontine d'épargne. C'est exactement la règle de Money Fellows, et elle n'exclut
personne : elle fait mériter les premières places.

---

## 6. Le verrou des fonds et la protection contre le défaut

### 6.1 Quatre verrous, du plus doux au plus ferme

1. **Les cotisations sont verrouillées** dans l'enveloppe de la tontine jusqu'au
   tour. Personne ne peut les retirer, pas même l'organisateur.
2. **Le prélèvement automatique à l'échéance**, accepté une fois à l'entrée. Si le
   salaire arrive par SwimPay, la cotisation part **le jour de la paie**, avant que
   l'argent ne soit dépensé.
3. **La retenue de garantie** : celui qui touche le pot **avant d'avoir fini de
   cotiser** laisse une partie verrouillée, libérée au fur et à mesure qu'il paie
   ses cotisations restantes. C'est la réponse directe au défaut après avoir touché.
4. **Le fonds de garantie de la tontine** : un petit pourcentage de chaque pot
   (§7) couvre une cotisation manquante, pour que **le bénéficiaire du tour reçoive
   toujours son pot complet**. En fin de cycle, ce qui n'a pas servi est rendu aux
   membres.

**Exemple chiffré de la retenue** `[H]` : 10 membres à 25 000 F par mois, pot de
250 000 F. Le premier à toucher doit encore 9 cotisations, soit 225 000 F. Une
retenue de 30 % du pot, soit 75 000 F, reste verrouillée ; 8 333 F sont libérés à
chacune de ses cotisations payées. Il dispose immédiatement de 175 000 F, et le
groupe est protégé. Plus on touche tard, plus la retenue est faible ; le dernier
n'en a aucune.

### 6.2 Quand un membre ne paie pas

1. **Rappel** la veille de l'échéance, puis le jour même.
2. **Délai de grâce de 72 heures** `[H]`, avec une **pénalité de retard fixe** (le
   modèle de Money Fellows, qui fait signer un contrat) `[T]`.
3. Passé le délai, le **fonds de garantie** paie à sa place : le bénéficiaire du tour
   n'attend pas.
4. La **retenue de garantie** du défaillant est saisie pour rembourser le fonds, et
   son score baisse. Il ne pourra plus prendre les premiers tours.

### 6.3 Quand la tontine n'est pas complète

Money Fellows finance lui-même les places manquantes (moins de 8 % des cas) `[T]`.
Pour SwimPay, deux options, **à trancher par LO** :

- **Ne démarrer que complète.** Sans risque, mais les groupes attendent.
- **Proposer la place libre** à des membres éligibles d'autres tontines, qui ont un
  bon score. Ça crée des groupes plus vite, et c'est un moteur d'acquisition.

---

## 7. Ce que SwimPay gagne

La leçon de la première vague américaine : **sans revenu, pas de survie.** Voici
trois sources, **à arbitrer par LO**. Les pourcentages sont des propositions `[H]`.

| Source | Ce qu'on prend | Qui paie |
|---|---|---|
| **Les frais de service** | **1 % du pot** à chaque tour, prélevé au versement | Le bénéficiaire du tour |
| **La prime de place** (formule « places choisies ») | Les premières places paient une prime (ex. 3 % du pot), les dernières en reçoivent une part : **SwimPay garde la moitié, l'autre moitié récompense les dernières places** | Ceux qui veulent toucher tôt |
| **Les grandes tontines** (associations, mutuelles) | Un abonnement pour l'organisateur : plus de membres, rôles, exports | L'organisateur |

Le **fonds de garantie (1 % du pot)** n'est pas un revenu : il appartient aux
membres, et ce qui n'a pas servi leur revient en fin de cycle.

**Chiffrage sur une tontine type** : 10 membres, 25 000 F par mois, pot de 250 000 F,
10 tours.

| Formule | Revenu SwimPay par tour | Par cycle de 10 mois |
|---|---|---|
| Frais de service seuls (1 %) | 2 500 F | **25 000 F** |
| Frais + prime de place (3 % sur les 3 premières places, moitié gardée) | 2 500 F, plus 3 750 F sur 3 tours | **36 250 F** |

Pour comparer, Money Fellows facture en moyenne environ **4 % par an** du montant
avancé `[T]`. Notre proposition reste en dessous.

**La vraie valeur est ailleurs** : chaque membre d'une tontine ouvre un compte
SwimPay, cotise chaque mois, et laisse un historique de régularité. C'est ce qui
ouvre plus tard l'**avance sur salaire ou sur facture** (`22_LES_ZONES.md`), avec
un partenaire microfinance.

---

## 8. La traçabilité et l'international : ce qui rend le produit mondial

1. **Le journal de la tontine**, visible par tous les membres : chaque cotisation
   avec sa date, chaque tour, chaque usage du fonds de garantie. La pression sociale
   de la tontine traditionnelle devient une preuve.
2. **Le tirage prouvé** (§4) : l'équité se vérifie, elle ne se promet pas.
3. **Le passeport de régularité** `[H]` : une attestation de toutes les tontines
   menées à terme, exportable et vérifiable. Esusu a montré que la tontine peut
   construire un historique de crédit aux États-Unis `[T]` ; ici, c'est l'historique
   qu'un membre emporte avec lui : auprès d'une banque, d'un bailleur, **dans un
   autre pays**.
4. **La tontine sans frontière** : des membres dans plusieurs pays de l'UEMOA (le
   PI-SPI relie les huit), puis la diaspora. C'est le terrain le plus naturel pour
   l'export, puisque la tontine se pratique déjà partout où vit la diaspora
   africaine.

---

## 9. Les pièges des autres, et comment on les évite

| Piège | Qui l'a rencontré | Notre parade |
|---|---|---|
| Le membre arrête de payer après avoir touché | Tous | Retenue de garantie, prélèvement automatique le jour de la paie, premiers tours réservés aux bons scores, fonds de garantie |
| Aucun revenu | Première vague américaine | Frais de service et prime de place dès le premier jour |
| Tontines incomplètes | Money Fellows (moins de 8 % des places) | Démarrer complète, ou proposer les places libres aux membres éligibles |
| L'organisateur disparaît avec la caisse | Tontine traditionnelle | L'argent ne passe jamais par lui : enveloppe verrouillée |
| Le tirage contesté | Tontine traditionnelle | Tirage prouvé |
| « Est-ce fiable ? » | E-Tontine à ses débuts | Fonds cantonnés chez un émetteur agréé, journal visible, garantie |
| Des outils de suivi qui ne touchent pas l'argent | Tonti, Djangui | Chez SwimPay, l'argent est **dans** la tontine : on peut garantir, prélever, verrouiller |
| Pas de passage à l'échelle | Les tontines informelles | Invitations par WhatsApp et par le répertoire, découverte de places libres, grandes tontines pour les associations |
| Le pot dépasse le plafond de monnaie électronique | Propre à l'UEMOA | Versement direct sur la banque du bénéficiaire au-delà de 2 000 000 F |

---

## 10. Le parcours dans l'app

1. **Créer** : formule, montant, fréquence, nombre de membres, mode de rotation,
   date de départ.
2. **Inviter** : depuis le répertoire (scan sur autorisation), par lien WhatsApp,
   ou en ouvrant des places libres.
3. **Rejoindre** : l'app vérifie l'éligibilité, montre les places accessibles selon
   le score, et fait accepter le prélèvement automatique.
4. **Le tirage** : l'empreinte publiée, puis l'ordre révélé au démarrage.
5. **Pendant le cycle** : le journal, le prochain bénéficiaire, sa propre place, le
   fonds de garantie restant.
6. **Mon tour** : le pot reçu, la retenue de garantie verrouillée et sa libération.
7. **Fin de cycle** : le fonds de garantie non utilisé rendu, l'attestation ajoutée
   au passeport de régularité.

## 11. Ce que le Cerveau devra porter `[H]`

Des entités nouvelles : `tontine`, `membre_tontine`, `tour`, `cotisation`,
`retenue`, `fonds_garantie`, `engagement_tirage`. Une **machine à états explicite**
pour la tontine (en constitution → complète → tirée → en cours → terminée, ou
annulée) et pour chaque cotisation (due → payée, en retard, couverte par le fonds,
recouvrée). Tout en **entiers XOF**, chaque changement d'état journalisé, comme
le reste du Cerveau.

---

## 12. Ce que LO doit trancher

- [ ] Les **taux** : frais de service, prime de place, fonds de garantie, retenue.
- [ ] **Qui porte le risque** au-delà du fonds de garantie : les membres seulement,
      ou SwimPay en dernier recours, comme Money Fellows.
- [ ] Les **places libres** : démarrage seulement complet, ou ouverture aux membres
      éligibles.
- [ ] La **qualification réglementaire**, à faire confirmer par le partenaire EME :
      monnaie électronique ou collecte d'épargne ?
- [ ] Par quelle formule on **lance** : la tontine d'épargne, sans risque, me paraît
      la meilleure porte d'entrée.

---

## Sources

- Techpoint Africa, *MoneyFellows raises $13m* — https://techpoint.africa/news/moneyfellows-pre-series-c/ `[T]`
- 500 Global, *MoneyFellows: Old School Fintech* — https://500.co/content/egypt-s-money-fellows-uses-an-old-school-lending-tool-to-drive-fintech-innovation `[T]`
- Launch Base Africa, *How Money Fellows hit profitability* — https://launchbaseafrica.com/2025/10/21/how-money-fellows-hit-profitability-by-digitising-egypts-informal-gameya-and-processing-1-5b/ `[T]`
- Money Fellows, *How it works* — https://www.moneyfellows.com/en-us/how-it-works `[V]`
- Wamda, *Egyptian fintech startup digitizes the gameya* — https://www.wamda.com/2017/06/egyptian-fintech-startup-founder-digitizes-traditional-lending-practice `[T]`
- Medium, *Fintech Meets Rotating Savings and Credit Associations* — https://medium.com/@sunilsachdev/fintech-meets-rotating-savings-and-credit-associations-ffe30564f130 `[T]`
- FinTechtris, *Solving the Savings Gap with FinTech* — https://www.fintechtris.com/blog/solving-savings-gap-fintech `[T]`
- Bloom, *Partner Spotlight: Esusu* — https://bloom.co/blog/partner-spotlight--esusu/ `[T]`
- ScienceDirect, *Rotating savings and credit associations: a scoping review* — https://www.sciencedirect.com/science/article/pii/S2772655X23000393 `[T]`
- Socialnetlink, *E-Tontine : 80 millions de FCFA en 2019* — https://www.socialnetlink.org/2020/01/28/e-tontine-la-startup-senegalaise-realise-un-chiffre-daffaires-de-80-millions-de-fcfa-en-2019/ `[T]`
- Jeune Afrique, *MaTontine digitalise prêts et assurances* — https://www.jeuneafrique.com/619233/economie-entreprises/start-up-de-la-semaine-au-senegal-matontine-digitalise-prets-et-assurances/ `[T]`
- Tonti — https://tontiapp.com/ `[T]`
- allAfrica, *Une tontine numérique* (Ohana Africa, 28/09/2026) — https://fr.allafrica.com/stories/202609280688.html `[T]`
- Djangui, *Réglementation fintech et tontines numériques 2026* — https://djangui.net/blog/reglementation-fintech-tontines-numeriques-afrique-2026 — **non confirmé par la BCEAO**
- BCEAO, *Réglementation des systèmes financiers décentralisés* — https://www.bceao.int/fr/reglementations/reglementation-des-systemes-financiers-decentralises `[V]`
