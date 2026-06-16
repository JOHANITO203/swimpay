# Ordre de paiement programmable & Ledger — design de direction

> **Statut (2026-06-16) : DESIGN VALIDÉ — CŒUR DÉTERMINISTE CONSTRUIT, BORDS PHYSIQUES SIMULÉS.**
> Le **cœur off-chain complet** (Cost Oracle + ledger + ordre + règles + swarm +
> réconciliation + moteur) est **réel et testé** (`apps/api/src/settlement/`, voir
> « Implémenté »). Ce qui reste **simulé** : les bords physiques (escrow on-chain
> déployé, confirmation blockchain live, rampe licenciée) — derrière des interfaces
> prêtes, jamais présentés comme du live (`SimulatedRails.simulated === true`).
> Le cœur est **câblé derrière l'endpoint SDK** `POST /v1/settlement/orders` (rails
> simulés, `simulation:true`). **Reste design-only : MCP/402.** Le runtime *receive-only*
> historique (détection → matching → webhooks) tourne toujours en parallèle.

## Pourquoi ce virage

Le modèle actuel (récupération d'événements par scraping de notifications) a une
colonne vertébrale fragile : le `NotificationListener` casse en silence (accès
révoqué, OEM tue le service, format de notif change, banque ne poste rien de
parsable), et la « preuve » n'est jamais bank-grade. La direction décidée :
**arrêter de courir après l'événement, et devenir un canal de règlement
programmable** où la détection redevient une *source de réconciliation*, pas
l'épine dorsale.

## Le principe

**Tout est un ordre de paiement programmable.**

Un *payeur* émet un *ordre* : « envoie ce montant, à ce(s) bénéficiaire(s), sous
ces règles, par ce canal ». Le système exécute. Le ledger fait foi. Qui paie est
indifférent au système : **humain, agent IA, ou pair — c'est le même ordre.** Un
humain = un agent avec un doigt ; une IA = un agent avec une clé API ; un pair =
deux agents. Ce sont **les règles attachées à l'ordre** qui portent la
responsabilité — pas la plateforme.

## Les objectifs

1. **Relier** un payeur à un bénéficiaire, même à travers une frontière de monnaie.
2. **Rester indifférent à qui paie** — humain, agent IA, pair : un seul mécanisme.
3. **Atteindre les couloirs que personne d'autre n'atteint** (mobile money Afrique de l'Ouest).
4. **Reporter la responsabilité sur le payeur** via les règles et le non-custodial.
5. **Ne jamais inventer** — taux et frais réels, toujours (discipline d'honnêteté héritée).

## Les sous-systèmes (les mouvements élémentaires)

Une opération = un enchaînement de ces six mouvements. Pas davantage.

1. **Entrée** — la valeur entre côté payeur (fiat via rampe, ou stablecoin).
2. **Conversion** — si monnaie d'entrée ≠ sortie, swap via stablecoin au moins cher. *(optionnel — le bridge)*
3. **Garde** — la valeur attend sous une règle (condition, délai). *(optionnel — l'escrow)*
4. **Répartition** — une entrée → plusieurs bénéficiaires. *(optionnel — le split N×M)*
5. **Sortie** — la valeur atterrit côté bénéficiaire (fiat via rampe, ou stablecoin).
6. **Réconciliation** — on confirme que c'est bien arrivé. *(= le système de détection actuel, recyclé)*

## Les opérations (combinaisons de mouvements)

| Opération | Chaîne de mouvements | Pour qui |
|---|---|---|
| **Coter** (devis) | *aucun mouvement* — on calcule le coût réel | Cost Oracle (service IA n°1) |
| **Payer direct** | Entrée → Sortie | Acheteur → marchand, même monnaie |
| **Payer + convertir** | Entrée → Conversion → Sortie | Rouble → XOF, etc. |
| **Payer sous condition** | Entrée → Garde → *(condition)* → Sortie | Escrow, livrer-puis-payer |
| **Payer plusieurs** | Entrée → Répartition → Sorties | Un paiement, N bénéficiaires |
| **Encaisser** | Entrée → Garde (pour le marchand) | Collecte |
| **Rembourser** | Garde → retour payeur | Échec / expiration |

## L'ordre de paiement programmable

### Champs

- **Identité** : `order_id` ; `idempotency_key` (fournie par le payeur — rejouer n'exécute jamais 2×) ; `created_at` ; `payer { id, type: humain | agent_ia | pair }`
- **Valeur** : `amount_in_minor` (entier) + `currency_in` ; `currency_out` ; `quote { rate, fee_minor, source, timestamp, expires_at }` — **verrouillé, jamais inventé** (expiré → re-cote)
- **Bénéficiaires** (1..N) : `{ id, méthode (mobile_money|banque|stablecoin), part (montant fixe ou %), amount_out_minor }`
- **Règles attachées** : `{ plafond, liste_blanche, palier_kyc, condition_libération, expiration, killable }`
- **Route** : `channel (direct|bridge)` ; `legs` (séquence de mouvements planifiés)
- **État & traces** : `state` ; `ledger_txn_ids` ; `reconciliation` (par sortie : `{ confirmé, preuve, at }`)

### Cycle de vie (machine à états)

```
                  ┌─ règle échoue ──────────────► REJETÉ
QUOTÉ ──► AUTORISÉ ┤
  │               └─ payeur engage ──► FINANCÉ
  │ (devis expire)                        │
  ▼                          ┌─ pas de condition ─┐
EXPIRÉ                       ▼                     │
                          EN_GARDE ──condition OK──► LIBÉRATION
                             │                          │
                  condition échoue / expire             ▼
                             ▼                       RÉGLÉ
                       REMBOURSEMENT                    │
                             │                   sortie confirmée
                             ▼                          ▼
                        REMBOURSÉ                  RÉCONCILIÉ ✅
```

`RÉCONCILIÉ` est le **seul** état de succès terminal — on ne crie jamais victoire à `RÉGLÉ`.

### Invariants de l'ordre

1. **Idempotence** : même `idempotency_key` → même ordre, jamais réexécuté.
2. **L'argent ne se crée ni ne se détruit** : chaque transition = écritures en partie double équilibrées.
3. **Devis honnête et verrouillé** : `source + timestamp + expiry` ; expiré → re-cote, jamais deviné.
4. **Pas de ponction unilatérale** : en garde, les fonds ne vont **qu'**aux bénéficiaires de la liste blanche, ou reviennent au payeur. *(C'est le non-custodial.)*
5. **RÉGLÉ ≠ RÉCONCILIÉ** : tant que la réconciliation n'a pas confirmé, ce n'est pas fini.

## Le ledger (partie double, append-only)

### Trois objets

- **Compte** : `{ id, propriétaire, devise, type }`. Types : `payeur`, `escrow` (un par ordre), `bénéficiaire`, et système : `frais`, `pont_fx`, `rampe_in`, `rampe_out`. **Un solde n'est jamais stocké — il se calcule = somme des écritures.**
- **Écriture** : `{ id, compte_id, montant_minor (signé : + crédit / − débit), devise, txn_id, créée_le }`. **Immuable.**
- **Transaction** : groupe d'écritures qui **s'équilibre à zéro par devise**. `{ id, order_id, transition, écritures[], idempotency_key }`.

### Règle d'or

**Chaque transition d'état de l'ordre = exactement une transaction équilibrée.**
C'est la contrainte de structure qui *garantit* l'invariant « l'argent ne se crée ni ne se détruit ».

| Transition de l'ordre | Transaction au ledger |
|---|---|
| QUOTÉ → AUTORISÉ | *aucune* |
| → FINANCÉ | Entrée : −rampe_in, +escrow |
| (Conversion si in≠out) | au taux verrouillé du devis, contrepartie sur `pont_fx` |
| EN_GARDE | *aucune* |
| → LIBÉRATION → RÉGLÉ | −escrow, +frais, +bénéficiaires (split), puis −bénéficiaires, +rampe_out |
| → RÉCONCILIÉ | *aucune* — on marque les écritures de sortie « confirmées » |
| → REMBOURSÉ | contre-passation : −escrow, +rampe_in |

### Exemple (en écritures)

> Agent paie 10 000 RUB → 100 USDT dans le pont. Frais 2. Split 90/10 vendeur/livreur, vers mobile money XOF.

- **FINANCÉ** *(USDT)* : `+100 escrow` / `−100 rampe_in` → Σ = 0
- **LIBÉRATION** : `−100 escrow` / `+2 frais` / `+88,2 vendeur` / `+9,8 livreur` → Σ = 0
- **SORTIE** : `−88,2 vendeur` `+88,2 rampe_out` · `−9,8 livreur` `+9,8 rampe_out` → Σ = 0
- **RÉCONCILIÉ** : la détection confirme les 2 dépôts XOF → écritures `rampe_out` confirmées.
- *(Échec livraison → REMBOURSÉ : `−100 escrow` / `+100 rampe_in`.)*

### Invariants du ledger

1. **Partie double** : toute txn, Σ écritures = 0 par devise.
2. **Append-only** : jamais d'édition/effacement ; une correction = une **contre-passation**.
3. **Solde dérivé** : toujours calculé, jamais stocké en dur.
4. **Idempotence** : la txn porte la clé d'idempotence (ordre + transition) ; rejouer = no-op.
5. **Conservation cross-devise** : une conversion n'invente pas de valeur — `pont_fx` porte la contrepartie au taux du devis.
6. **Traçabilité** : `txn.order_id` toujours présent.

Le ledger est le **miroir off-chain de la vérité on-chain + fiat**. La vérité crypto = la chaîne (contrat d'escrow) ; la vérité fiat = la confirmation du partenaire rampe. La **réconciliation** unifie et maintient l'honnêteté.

## Décisions de couloir & de rail

- **Custody → non-custodial** autant que possible : escrow par contrat, la plateforme ne contrôle jamais les fonds unilatéralement. C'est la seule façon de *réellement* reporter la responsabilité sur l'user (le régulateur regarde qui contrôle les fonds, pas la CGU).
- **Bords fiat = partenaires licenciés** (rampes on/off) : la custody fiat part chez un licencié ; SwimPay reste couche tech.
- **Cœur d'escrow/netting N×M → EVM L2** (primitives auditées type 0xSplits/Safe ; atomicité). **TON = canal** (distribution Telegram + micro-paiements/402 + on-ramp), **pas** le coffre du règlement complexe (modèle asynchrone → atomicité multi-parties risquée). Un bridge relie les deux. Sur TON le stablecoin est **USDT** ; sur EVM, **USDC** préféré (compliance).
- **Couloir tête de pont = mobile money Afrique de l'Ouest (XOF : Wave/Orange/Free)** — seul couloir avec à la fois un moat et une rampe conforme viable (Yellow Card / Bitnob / Onafriq / HoneyCoin / Paychant, à re-vérifier au moment d'intégrer).
- **USD** = bord pratique, commoditisé, pas un moat.
- **Russie (RUB)** = **détection passive uniquement**. Pas de règlement actif stablecoin (mur de sanctions, pas de rampe USDC↔RUB conforme côté occidental).

## Acteur IA : confirmé

Un agent IA est un acteur on-chain de plein droit (smart accounts **ERC-4337 + session keys** ; x402 déjà à l'échelle en 2026). Il exécute **toutes les opérations on-chain dans son périmètre** (escrow/libération/split/remboursement/transfert) ; le périmètre = nos règles, gravées on-chain. Les **bords fiat ne sont pas on-chain** : l'agent les pilote en appelant les API des rampes (HTTP), sous KYC du partenaire.

### Services vendables aux IA (ordre de mise sur le marché)

1. **Cost Oracle** — coût réel de règlement multi-couloirs, payé à la requête. Zéro custody, constructible tout de suite. **Le premier à lancer pour se positionner.**
2. **Payout local** — agent paie en stablecoin → humain payé en mobile money XOF. *Le moat.*
3. **Collect** — encaisse des acheteurs en fiat local → agent reçoit en stablecoin.
4. **Escrow conditionnel** — paie seulement si condition remplie.
5. **Spend Guardrails** — plafonds, listes blanches, kill-switch sur les dépenses d'agent.
6. **Last-mile humain** — agent paie un humain pour une tâche réelle, réglé instantanément en local (= 2+4+5 empilés).

## Le moteur de règles

**Principe d'exécution : déterministe, sans LLM.** Toutes les opérations sont des
transitions d'état gardées par des prédicats déterministes. Un orchestrateur
déterministe (pas un LLM) exécute 100 % des opérations : route la moins chère =
un tri ; sharding = `ceil(total/plafond)` ; règles = des prédicats. Un LLM ne
pourra venir, *plus tard*, que sur la **couche d'interface** (comprendre une
intention en langage naturel) — **jamais** sur les maths de fonds.
**L'IA propose, les règles disposent.**

**Une règle est un garde posé sur une transition.** Avant qu'une transition ne
crée une transaction au ledger, le moteur évalue les règles attachées. Une seule
qui refuse → pas de transition → **aucun mouvement d'argent**.

```
evaluer(ordre, contexte) → AUTORISE
                         | REFUSE(raison)   → REJETÉ (définitif)
                         | RETIENS(raison)  → reste en attente (pas encore)
```

Règles **pures** (aucun effet de bord), **déterministes**, et **chaque décision
journalisée** (append-only, comme le ledger).

### Catalogue

| Règle | Évaluée à | Issue si KO | Empêche |
|---|---|---|---|
| Kill-switch | Autorisation | REFUSE | Tout (coupe-circuit) |
| Expiration | Autorisation / Garde | REFUSE (→ EXPIRÉ) | Un ordre périmé |
| Plafond | Autorisation | REFUSE | Montant > limite |
| Vélocité | Autorisation | REFUSE / RETIENS | Trop d'ordres/montant par fenêtre |
| Liste blanche | Autorisation | REFUSE | Bénéficiaire non prévu (= non-custodial) |
| Screening / sanctions | Autorisation | REFUSE | Bénéficiaire ou route signalés |
| Palier KYC | Autorisation | REFUSE / RETIENS | KYC payeur < requis pour ce montant |
| Condition de libération | Garde → Libération | RETIENS | Sortie avant condition remplie |

### Deux points d'évaluation
1. **À l'autorisation** (`QUOTÉ → AUTORISÉ`) : règles structurelles (kill-switch, expiration, plafond, vélocité, liste blanche, screening, KYC). Verdict : REJETÉ, ou on continue.
2. **À la libération** (`EN_GARDE → LIBÉRATION`) : la condition de libération (RETIENS jusqu'à remplie ; expiration d'abord → REMBOURSÉ).

`deny-by-default`, toutes les règles en ET logique. On évalue **les refus les moins chers d'abord** (locaux/instantanés) avant les appels externes (KYC, screening) ; premier REFUSE → on s'arrête.

### Règle Swarm (sharding d'exécution)

**Le swarm découpe l'EXÉCUTION, jamais l'IDENTITÉ.** Deux plafonds distincts :

| Plafond **technique** (par leg / sous-agent) | Plafond **de conformité** (par identité / agrégat) |
|---|---|
| ex. 50 $ — gas, limites de rampe, rayon d'explosion si une clé fuit | ce que le KYC autorise — risque, sanctions, blanchiment |
| **Shardable librement** | **Jamais shardable** |

Si `montant > plafond_technique` → fan-out de `ceil(montant / plafond_technique)`
legs. Mais les règles de **conformité (KYC, plafond agrégat, vélocité agrégée,
screening) sont évaluées sur le PARENT, sur le total, AVANT tout shard.** Vélocité :
haute par sous-agent, **bornée à l'agrégat parent**. On-chain : plafond agrégat sur
le **smart-account maître**, session keys filles chacune ≤ plafond technique.

> ⚠️ Découper un montant pour passer *sous* un plafond de conformité = **structuring / smurfing** = interdit, et **trivialement détectable** sur un registre transparent (un fan-out depuis une source unique se voit instantanément). On route **toujours l'agrégat vrai, par identité, à travers la rampe.**

### Règle KYC

**Le KYC officiel est sur la rampe licenciée, PAS sur la blockchain.** Une chaîne
publique est *permissionless* : aucun KYC natif. Elle trace le **parcours**
(adresses — permanent, public, forensique) mais **pas l'identité** (pseudonyme).
On **hérite** donc du KYC + monitoring AML de la **rampe**, évalué sur l'**agrégat
parent**. Screening complémentaire = blacklist de l'**émetteur du stablecoin**
(Circle gèle les adresses sanctionnées sur USDC). Le « plafond bloquant du swarm »
= « la rampe a-t-elle KYC cette identité pour cet agrégat ? », jamais un appel à la
chaîne (qui ne répondrait rien).

## La réconciliation

**RÉGLÉ ≠ RÉCONCILIÉ.** Le ledger dit « j'ai envoyé » ; la réconciliation
**confirme que c'est réellement arrivé** — et ne déclare jamais « fini » avant.
C'est la discipline « zéro donnée inventée » appliquée au règlement.

**Changement de classe.** Comme c'est SwimPay qui *initie* le paiement (et non plus
un observateur passif d'événements subis), la confirmation vient d'une **source
autoritaire de première main**, plus d'un scraping de notif espéré. La fragilité
du `NotificationListener` est dissoute par ce modèle.

### Hiérarchie de confirmation (on *suit*, on n'*attend* pas)

| Jambe | Confirmation autoritaire |
|---|---|
| **On-chain** | **Confirmation de transaction blockchain** (tx hash + N confirmations). Déterministe, toujours dispo. La base fiable. |
| **Fiat** | **Statut de payout de la rampe** via son API (poll de l'endpoint de statut, ou webhook). Autoritaire car c'est nous qui avons déclenché le payout chez elle. |

**Règle de préférence : tracking actif autoritaire > signal passif.**
1. La chaîne confirme → on suit la chaîne.
2. Sinon (fiat) → on tracke le statut via l'API de la rampe.
3. La **notif détectée** n'est plus qu'une **corroboration optionnelle** (bonus gratuit si dispo) — **jamais seule, jamais bloquante.**

> Conséquence : **on ne s'intègre qu'à des rampes qui exposent un statut de payout par API.** Une rampe qui ne sait pas dire « livré / échoué » nous ferait retomber dans la dépendance au signal — inacceptable.

### Matching

```
PRINCIPAL :  intention (ledger) ↔ confirmation autoritaire (chaîne / API rampe)
OPTIONNEL :  + signal notif  ── corroboration, jamais requise
```

La réconciliation garde **les deux bouts** : confirmer l'**entrée** réelle *avant* EN_GARDE (jamais escrow d'argent fantôme), et la **sortie** réelle *avant* RÉCONCILIÉ.

### États d'une jambe & écarts

```
ATTENDUE ──preuve autoritaire concordante──► CONFIRMÉE
   └──────── pas de preuve / divergence ────► ÉCART
```

| Écart | Action |
|---|---|
| Manquante / en retard | Retry du leg → alerte → enquête. **Jamais marquer réconcilié.** |
| Montant divergent | **Écriture d'ajustement** (contre-passation + écriture au montant réel) + flag. Jamais d'édition. |
| Inattendue | Preuve sans jambe attendue → collecte entrante à matcher, ou anomalie → suspens. |
| Double | **Dédup par idempotence** (tx hash / id callback unique). |

### Swarm

Chaque leg se confirme via *sa* source autoritaire, indépendamment. Parent
RÉCONCILIÉ **seulement quand les N legs sont confirmés**. Partiel → parent
*partiellement réglé*, on **rejoue uniquement les legs en écart**.

### Invariants

1. **Preuve positive obligatoire** : RÉCONCILIÉ seulement sur preuve réelle. Jamais par défaut ni par timeout optimiste.
2. **Tout écart = une écriture, jamais une édition** (append-only, contre-passation).
3. **Matching déterministe** : `(montant ± tolérance définie, destination, fenêtre, référence/idempotence)`. Aucune inférence floue.
4. **Idempotence de la preuve** : une même preuve (tx hash, id callback) ne confirme qu'une fois.

### Collecte (la seule nuance)

Une collecte où l'acheteur paie par un rail externe se traite aussi en **tracking
actif** : on route la collecte *à travers l'API de la rampe* (l'acheteur paie dans
son endpoint), la rampe confirme par API. La notif ne revient en dernier recours
que pour un rail sans aucune API — à éviter.

## Suite

- **MCP + 402** — exposer les opérations comme outils appelables par agents, payés à l'appel (MCP = découverte/appel, 402 = paiement). *(en cours — première couche produit sur le socle)*

## Implémenté (réel, testé — 2026-06-16)

**Cost Oracle v1** — premier service du modèle, opération *Coter*, lecture seule,
zéro custody, corridors actifs **USD→XOF / EUR→XOF** (RUB volontairement absent).

- `apps/api/src/cost-oracle.ts` — module pur déterministe : registre de corridors
  *pluggable* (`findCorridor`/`listActiveCorridors`), `composeQuote` (jambes FX +
  réseau + rampe, **devis partiel honnête** si une jambe manque, total `available`
  seulement si toutes le sont), sources par défaut `StaticNetworkFeeSource` (estimation
  L2 datée, labellisée) et `PublishedRampFeeSource` (Yellow Card ≈2 % mobile money XOF
  sourcé/daté ; Bitnob `available:false` car barème non publié — jamais inventé).
- `apps/api/src/server.ts` — `GET /v1/cost/quote?from=&to=&amount=` : réutilise
  `FxRateService`, ne 500 jamais, corridor inconnu → `available:false`.
- Tests : `apps/api/src/cost-oracle.test.ts` (8) + `payment-sessions.test.ts` bloc
  « cost oracle endpoint » (4). **93/93 verts, typecheck clean.**
- Corridor-agnostic : ajouter un corridor (le jour venu, RUB inclus *si légal*) =
  une entrée de registre + un adaptateur. **Aucun code RUB n'est pré-livré.**

**Cœur de règlement déterministe** — le squelette complet, réel et testé, sous
`apps/api/src/settlement/` (150/150 tests verts, typecheck clean) :

- `ledger.ts` — partie double, append-only, idempotent, soldes dérivés, contrôle de conservation.
- `payment-order.ts` — l'ordre + machine à états (QUOTED→…→RECONCILED, branches REJECTED/EXPIRED/REFUNDED/FAILED).
- `rules-engine.ts` — gardes de transition (catalogue : kill-switch, expiration, plafond, vélocité, liste blanche, screening, KYC, condition) + `planSwarm` (sharding d'exécution, jamais d'identité).
- `reconciliation.ts` — matching autoritaire (chaîne / API rampe), notif = corroboration seulement, preuve liée à sa jambe (`legRef`), idempotence par référence.
- `settlement-rails.ts` — interface des bords physiques + `SimulatedRails` (**`.simulated === true`**, jamais confondu avec du live).
- `settlement-engine.ts` — le chef d'orchestre : ordre→ledger sous garde des règles, conversion bridge, split exact (loss-free), swarm, payout+réconciliation par shard, retry des shards en écart.
- `settlement-api.ts` — **la nouvelle surface SDK** : `FxRateConverter` (branché sur `FxRateService`), `SettlementService` (registre in-memory), validation + forme de requête/réponse. Câblé dans `server.ts` : `POST /v1/settlement/orders` (crée + règle), `GET /v1/settlement/orders/:id`, `POST …/:id/retry` — authentifié marchand, réponses `simulation:true` / `rail_mode:'simulated'`.

**Reshaping SDK** : la surface passe du modèle *receive-only* (détecter un paiement entrant) au modèle *ordre de paiement programmable* (piloter un flux payeur→bénéficiaire). L'endpoint `/v1/settlement/orders` est la nouvelle forme.

### Durcissement TIER 1 (en cours) — vers un système, plus seulement un moteur

- **`033_programmable_settlement_ledger.sql`** — tables durables : accounts, transactions, entries, orders, recon_legs, proofs (additif, idempotent).
- **`ledger-store.ts`** — interface `LedgerStore` *async* ; le moteur en dépend (plus de couplage à l'in-memory).
- **`InMemoryLedgerStore`** — enveloppe le `Ledger` prouvé (tests/dev). **`PgLedgerStore`** — Postgres durable : un `post()` = une transaction DB, `SELECT … FOR UPDATE` sur les comptes (sûreté concurrente), idempotence par contrainte `UNIQUE` + pré-check, soldes par `SUM` indexé.
- Moteur + `SettlementService` refactorés sur le store async (157→ tests verts ; 3 tests d'intégration Pg se skippent sans `DATABASE_URL`).

**Honnêteté** : `PgLedgerStore` est du **code réel mais non testé contre une DB live ici** (aucune Postgres dans l'environnement) — même statut que les autres repos Pg du repo. À vérifier via la suite d'intégration avant confiance.

**Reste TIER 1** : stores Postgres pour ordres + réconciliation, reprise HELD, reprise après crash, câblage Postgres dans `server.ts`, tests d'intégration DB.

### Pilote non-custodial crypto-only (payeurs A = agent IA / B = humain crypto)

Le modèle bootstrap **sans société, sans rampe, sans custody** : le payeur paie le
marchand **directement en stablecoin** ; SwimPay **lit la chaîne** pour confirmer.
Prix en n'importe quelle fiat (devis FX) ; règlement en stablecoin.

- `chain-reader.ts` — `ChainReader` **lecture seule** (zéro clé) : `InMemoryChainReader`
  (tests) + `JsonRpcChainReader` (réel, sans dépendance, lit les logs ERC-20 Transfer ;
  non testé contre un RPC ici).
- `payment-intent.ts` — flux intention : créer (devis prix→USD→USDC, instruction
  « envoie X USDC à l'adresse du marchand »), confirmer via lecture de chaîne (N
  confirmations), expiration TTL. **Ne détient jamais de fonds** (`custodial = false`).
- 11 tests verts. Fit naturel du payeur A : l'agent IA paie nativement en stablecoin (402).

**Condition légale du modèle sans société : strictement non-custodial** (payeur→marchand
direct, SwimPay ne tient jamais les fonds).

**Endpoints livrés** (gated off par défaut, `CRYPTO_PILOT_ENABLED`) :
- `POST /v1/intents` (auth marchand) — crée la demande de paiement.
- `GET /v1/intents/:id` — **surface x402 réelle** : `402 Payment Required` (+ instruction) tant qu'en attente, `200` une fois confirmé on-chain, `410` si expiré. Sert A (agent) et B (humain).

**Config pour lancer** (USDC vérifié, source Circle) :
```
CRYPTO_PILOT_ENABLED=true
CRYPTO_PILOT_TOKEN_SYMBOL=USDC
CRYPTO_PILOT_TOKEN_DECIMALS=6
CRYPTO_PILOT_MIN_CONFIRMATIONS=2
# Testnet (répétition gratuite) :
BASE_RPC_URL=https://sepolia.base.org
CRYPTO_PILOT_CHAIN=base-sepolia
CRYPTO_PILOT_TOKEN_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
# Mainnet (vrais users) — mêmes vars, on bascule :
# BASE_RPC_URL=https://mainnet.base.org
# CRYPTO_PILOT_CHAIN=base
# CRYPTO_PILOT_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```
RPC public OK pour démarrer ; passer à Alchemy/Infura si `eth_getLogs` est limité.
`JsonRpcChainReader` est réel mais non testé live ici → le run testnet est la vérification.

**Bug corrigé à la racine** pendant le build : la preuve d'un payout doit référencer
*sa* jambe (`legRef`), sinon des shards fongibles se confirment de façon découplée du
ledger → une jambe pouvait passer RECONCILED sans mouvement d'argent. Corrigé + testé.

**Reste « simulé » (bords physiques uniquement)** : escrow on-chain déployé,
confirmation blockchain réelle, statut rampe live, jambes réseau/rampe *live* du Cost
Oracle. Les interfaces (`SettlementRails`, `Converter`) sont prêtes ; on branche le réel
(contrats + rampe licenciée + clés) quand partenaire/chaîne sont disponibles.
**Reste design-only** : MCP/402.

## Garde-fous honnêtes (à ne jamais perdre de vue)

- « Responsabilité à l'user » n'est tenable que par l'**architecture non-custodial**, pas par la CGU.
- « Chaîne la moins chère » doit rester une chaîne **propre** (pas de mixer / chaîne sale).
- Le couloir RU + stablecoin = terrain de sanctions ; screening obligatoire même en non-custodial.
- Le ledger doit être idempotent et concurrent-safe **dès la première ligne** ; c'est là que les systèmes d'argent meurent.
