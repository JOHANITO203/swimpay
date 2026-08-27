# SwimPay — Stratégie de construction (synthèse, 2026-08-27)

Issu d'un panel de 4 plans indépendants (exécution solo, distribution terrain,
partenariats/réglementaire, produit/moat) passés au feu de 2 contre-expertises
(réalité terrain CI, unit economics). Ce document est la fusion de ce qui a
survécu. Réfs : `03_RESEARCH_COMPLETE.md`, `04_PROBLEM_MAP.md`.

## 0. La thèse en une phrase

**Vendre l'ordre, pas le mouvement.** Le seul revenu qui survit à PI-SPI est le
logiciel (caisse + réconciliation + FNE, en abonnement) ; le paiement est un
produit d'appel à prix coûtant ; le swap n'est pas un revenu (marge structurelle
négative) mais au mieux une pompe à identité, bridée ; la paie B2B n'existe
qu'avec une grille payout de gros écrite. On vend AVANT de coder, et l'argent ne
dort jamais chez SwimPay la première année.

## 1. Les corrections que le red-team impose (à ne pas re-perdre)

1. **Le swap perd de l'argent à chaque opération.** Un swap = payin (~1 %) +
   payout (~0,5-1 %) ≈ 1,5-2 % de coût. À 0,8 % plafonné 500 F, un swap de 100k
   perd ~1 000-1 500 F — et le plafond attire précisément les gros montants
   (anti-sélection). → Le tuer, ou le brider : plafond **25 000 F/opération**,
   budget de perte mensuel dur (~50k comptabilisé en CAC), jamais de page
   d'acquisition publique, validation écrite que la licence EP du partenaire
   couvre ce flux. S'il vit, son rendement est le **KYC** (chaque swap prouve par
   OTP 2 endpoints du graphe d'identité), pas la marge.
2. **Le cash est 60-90 % de la caisse du micro-commerce.** Un produit qui ne
   voit que le mobile money ment quand il dit « ta caisse est comptée » — et la
   FNE couvre AUSSI les ventes cash. → **Bouton « vente cash » en une touche +
   FNE sur vente cash dès la v0.** C'est même le cheval de Troie : toute la
   valeur logicielle sans exiger de changer de moyen d'encaissement.
3. **Ne pas être le mouchard de la DGI.** Le semi-informel sous-déclare
   volontairement ; un outil qui pousse 100 % des encaissements vers le fisc le
   fait fuir. → **Cibler le marchand formel/semi-formel FOURNISSEUR de PME** (la
   pression qui vend est commerciale — le client B2B exige la facture pour
   déduire sa TVA — pas fiscale), **FNE sélective et à la demande**, pitch qui
   ouvre sur « ta caisse comptée chaque soir », jamais sur « impôts ».
4. **Le spread d'encaissement est un mirage.** Wave a ancré 1 % tout compris ;
   le contournement gratuit existe (P2P vers le numéro perso). → Encaissement à
   **prix coûtant (≤1 %)**, 100 % de la marge dans l'abonnement.
5. **Prix SaaS réalistes** : 10-12k/mois = 7-8 % du revenu d'un boutiquier =
   invendable en masse. → **2 500-5 000 F/mois micro**, **10 000 F PME
   multi-caisses**, console comptable gratuite <10 dossiers puis 1-2k/dossier
   (le comptable refacture). Essai gratuit **30 jours max** (jamais 6 mois).
   **Prépaiement trimestriel** dès la semaine 1 (10 pilotes × 3 mois = ~300k de
   trésorerie immédiate).
6. **Le règlement est la bombe confiance.** Premier retard → « SwimPay a mangé
   mon argent » dans le groupe WhatsApp qu'on a créé soi-même. → Payout API
   transaction par transaction plutôt que batch, **T+1 écrit avec pénalités**,
   **tampon de règlement 300-500k** sur le budget, statut de chaque payout
   visible par le marchand.
7. **Le portefeuille du partenaire commercial est un SPOF non testé.** →
   **Test de charge semaines 1-2 : 20 rendez-vous TENUS** (pas une liste
   Excel). En dessous : canal comptables activé en principal dès le mois 1.
   Rémunération : 20 % du MRR apporté (12 mois) + petit variable cash à
   l'activation. Jamais de fixe.
8. **Le concierge FNE ne passe pas l'échelle B2C** (10 pilotes × 20 ventes/j =
   6-7 h de saisie par nuit). → Concierge restreint aux **profils B2B / gros
   tickets (<10 factures/jour)**, plafonné à 5-10 pilotes ; l'automatisation
   (RPA portail DGI) est un prérequis avant le 6ᵉ client B2C, pas une
   optimisation du mois 2.
9. **WhatsApp coûte** (~10-25 F/message template). → **Un digest quotidien à
   20h** (~300-750 F/marchand/mois, intégré au prix) + push PWA pour le temps
   réel. Interdit architectural : la notification WABA par transaction.
10. **Le fondateur doit manger.** Point mort ≈ **138 abonnés payants à 5k**
    (~690k MRR pour couvrir vie + infra + part partenaire) — atteignable M9-12,
    pas J90. → **~9 mois de subsistance personnelle sécurisés HORS budget
    société**, sinon étirer le calendrier ; les 1,75M sont sanctuarisés :
    juridique ciblé (250-400k), kits (~150k), infra, tampon règlement,
    commissions d'activation.
11. **Architecture : version légère d'abord.** Le ledger double-entrée complet
    event-sourcé attend le contrat distributeur. Jour 1 : **RailAdapter +
    payloads bruts (`external_events`) + champ NCC (vide) + journal d'intents +
    moteur de réconciliation**. Le « coffre + enveloppes » complet est un plan
    d'an 2 — et le sweep instantané via PI-SPI (rail gratuit) peut donner l'UX
    de wallet **sans jamais** avoir besoin d'e-money (à trancher aux chiffres,
    M6-12).

## 2. Les pépites du panel (à exploiter)

- **Vendre avant de coder** : le concierge FNE prépayé encaisse en semaine 1 ;
  la saisie manuelle documentée EST la spec de l'automatisation.
- **Le comptable ambulant est le vrai canal** : 1 comptable = 20-50 dossiers ;
  console multi-dossiers gratuite → il refacture et devient revendeur. La
  meilleure arithmétique CAC des 4 plans. Boucle : « la FNE recrute le
  comptable, le comptable recrute les marchands ».
- **Les agents mobile money en reconversion** comme force terrain : leurs
  commissions cash-in/out s'effondrent (MTN 0 %, PI-SPI) ; payés uniquement à
  l'**activation** (≥10 tx/semaine), jamais à l'inscription.
- **La PME acheteuse recrute ses fournisseurs** : démarcher les entreprises qui
  veulent déduire leur TVA — elles exigent des factures FNE, leurs fournisseurs
  viennent s'équiper seuls (boucle inversée, dès M1).
- **Le reçu FNE WhatsAppé est une surface publicitaire légalement inévitable**
  (« Encaissé via SwimPay » + lien), coût nul.
- **Le dossier KYC de la phase 1 EST le produit de la phase 2** : une banque
  paie déjà 5-15k de prime par compte DAV alimenté. KYCer les marchands au
  standard d'audit dès le jour 1 → arriver chez la banque en **vendeur d'un
  pipeline pré-qualifié avec son float**, pas en demandeur.
- **La cible distributeur phase 2 est une BANQUE moyenne, pas un télécom** :
  le combat mobile↔banque du fondateur = exactement le KPI dépôts/DAV d'une
  banque ; un MNO verrait un concurrent de son réseau d'agents. Term sheets
  Moov/MTN uniquement comme levier de pression.
- **PI-SPI est l'horloge de négociation** : clause de « rendez-vous tarifaire »
  indexée sur sa GA chez PayDunya ; promesse publique « gratuit le jour où le
  rail est gratuit » ; SwimPay est le seul acteur dont le modèle SOUHAITE la
  gratuité des transferts. Le 30/09/2026 = événement marketing.
- **La jointure MSISDN↔NCC↔recettes réconciliées** : les opérateurs ont les
  MSISDN, la DGI a les NCC, personne n'a la jointure. Chaque FNE émise la
  soude. La file d'exceptions de réconciliation = le laboratoire du crédit
  futur (l'alpha est dans les échecs/litiges, pas les transactions réussies).

## 3. Le plan séquencé (fusion corrigée)

### Jours 1-90
1. **S1-2** : test de charge du portefeuille (20 RDV tenus) · term sheet
   PayDunya en statut **sous-agrégateur** (volume chiffré en p.1) · **lettre de
   statut co-signée par la conformité PayDunya AVANT tout volume** · consultation
   juridique ciblée (250-400k, one-pager du montage pass-through).
2. **S1-4** : 5-10 pilotes **B2B/gros tickets** prépayés trimestriel (~300k
   encaissés) · concierge FNE le soir (la saisie = la spec).
3. **S2-6** : sandbox PayDunya (payin+payout) · build minimal : liens de
   paiement + webhook + **digest quotidien** · `RailAdapter` + `external_events`
   bruts + champ NCC · **bouton vente cash + FNE cash**.
4. **S4-8** : réconciliation v0 (matching intents↔webhooks, file d'exceptions)
   · automatisation FNE (RPA portail DGI).
5. **S6-10** : kits QR (~1 500 F/u, imprimeur d'Adjamé) · règle d'or : **la
   première vente est encaissée PENDANT la visite** (<10 min) · densité par axe
   commerçant, 1-2 zones, jamais dispersé · un groupe WhatsApp par zone.
6. **S8-12** : renégociation PayDunya avec les chiffres réels — les 2 lignes
   vitales d'abord (**payin ≤1 % + grille payout de gros écrite**), puis les 8
   clauses (T+1 pénalisé, attestation cantonnement mensuelle, référence unique,
   paliers dégressifs, rendez-vous tarifaire PI-SPI, changement de contrôle,
   préavis API 90 j, réversibilité 30 j avec restitution des KYC).

### Mois 3-6
- Canal **comptables** (console multi-dossiers gratuite) + 3-5 **ambassadeurs**
  ex-agents MoMo payés à l'activation · associations/chefs de marché.
- Facturation SaaS après essai 30 j : 2 500-5 000 F micro, 10k PME.
- Checkout e-commerce (même moteur) · **payouts vers RIB** (le combat
  mobile↔banque, terrain d'essai = le portefeuille B2B).
- Moteur de plafonds réglementaires (2M/10M/200k) codé même s'il ne sert pas
  encore — la moitié manquante de la frontière wallet.
- Ouvrir les conversations phase 2 : 2 banques moyennes + Moov (le plus
  flexible d'abord, pour créer la tension).

### Mois 6-12
- **Paie B2B** seulement si la grille payout l'autorise (prix plancher = coût +
  0,3-0,5 %, min 300-500 F/op).
- **Phase 2 distributeur** : signer la banque (dossier = pipeline de marchands
  pré-KYCés + leur float) ; alors seulement, migrer le ledger en mode
  sous-comptes légaux (« coffre + enveloppes » réels, plafonds actifs).
- **Jour PI-SPI** : bascule « transferts gratuits », clause de rendez-vous
  tarifaire exécutée, communication pendant que Change meurt sur son 2,5 %.
- **Dossier bancable** (12 mois de recettes réconciliées + FNE) → origination
  de crédit en revenue-share avec un prêteur licencié (Djamo microfinance en
  tête). Jamais de prêt au bilan.
- Cibles **réalistes** : 10-15 payants M3 · ~100 payants M6 · 200-300 payants
  M12 → **MRR 1-1,5M FCFA** (pas 3M). Le chiffre qui commande tout : **138
  payants à 5k = point mort**.

## 4. Les interdits (consensus panel + red-team, non négociables)

- Aucun solde client dépensable avant le contrat distributeur-EME (= e-money
  = 300M = le partenaire lâche SwimPay au premier contrôle).
- Pas d'app native, pas de NFC, pas de terminal physique au lancement (le
  téléphone est la caisse ; une PWA/APK légère offline-first suffit — le
  téléphone n'est qu'un AFFICHEUR, la vérité = le webhook serveur).
- Pas de guerre B2C contre Wave (21M comptes) ni Djamo ($17M).
- Pas de CinetPay en rail principal (J+8, docs hors-ligne, dette alléguée) —
  BATNA de négociation uniquement.
- Pas d'exclusivité, avec personne. Multi-rail dans le code, mono-rail dans le
  contrat.
- Pas de pub payante ; la confiance marchande s'achète en personne et en
  WhatsApp.
- Pas de crédit ni de promesse de crédit avant 12 mois de données.
- Jamais « bras de la DGI » dans le discours ; on vend la protection du
  marchand, pas la surveillance.
