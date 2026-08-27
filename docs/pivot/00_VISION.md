# SwimPay — Vision (pivot 2026-08)

> Ce document **remplace** la direction produit historique du repo (moteur de
> signaux notif-banque russe, « ni PSP ni custody »). Les docs `docs/00..24`,
> `AGENTS.md` et `README.md` décrivent l'ancien produit et sont à considérer
> comme **hérités** tant qu'ils n'ont pas été réécrits (voir §7).

## 1. En une phrase

SwimPay est la **couche neutre d'interopérabilité et de traçabilité** du Mobile
Money et bancaire en Côte d'Ivoire (zone UEMOA) : un citoyen, ses numéros et ses
comptes réunis sous une seule couche qui fait **circuler l'argent** entre wallets
(Wave, Orange, MTN, Moov), banques et commerces — et rend chaque flux traçable.

## 2. La thèse (le moat)

Le produit **n'est pas « les paiements »**. Le cœur défendable est une **couche
d'identité + traçabilité** :

- **Un citoyen → plusieurs numéros de téléphone → un seul ancré à une banque**,
  et la couche SwimPay par-dessus.
- Surfaces de paiement au-dessus : NFC sans contact, transferts mobile↔mobile,
  banque↔banque, checkout e-commerce, paie salariale.
- **Transparence des transactions** : positionnement que Wave et Orange (jardins
  fermés) n'ont aucun intérêt à offrir, mais que l'État veut pour la traçabilité.
  C'est l'angle rare et défendable de SwimPay.

## 3. Décision structurante : custody

SwimPay **fait circuler les fonds et contrôle les soldes** (décidé 2026-08-27).
Ce n'est pas un pass-through. Conséquence directe : le **grand livre (ledger)**
est le cœur du produit ; tout le reste n'est que des écritures par-dessus.

**Nuance juridique vérifiée (voir `02_RAILS_AND_CUSTODY_STRATEGY.md`)** : détenir
de la monnaie électronique en son nom = agrément **EME, 300 M FCFA**. SwimPay ne
fait donc **pas** ça au lancement. Le montage réel et documenté est le **modèle
sponsor** : SwimPay opère comme **distributeur/agent d'un partenaire licencié**,
les fonds vivent dans le **compte de cantonnement omnibus du partenaire**, et
SwimPay tient le **sous-registre** de *qui possède quoi*. Économiquement SwimPay
maîtrise et fait circuler l'argent ; juridiquement le partenaire le détient. Sans
partenaire signé, le ledger se prouve en **simulation** derrière la frontière
`RailConnector`.

## 4. Cibles

1. **Particuliers** — swap inter-réseaux, transfert, cash-in/out, NFC.
2. **Commerçants & freelances** — encaissement QR/NFC, liens de paiement.
3. **Entreprises** — paie des salaires **en 1 clic** (module UX simplifié),
   trésorerie banque↔wallet.
4. **Business digitaux / SaaS** — checkout e-commerce + API + webhooks (brique
   qui **survit** du repo actuel).
5. **État / régulateur** — traçabilité et reporting comme fonctionnalité.

## 5. Piliers techniques (ordre de construction)

1. **Ledger & Trésorerie** — comptabilité double-entrée ACID, soldes users,
   pools de float, réconciliation. *La fondation. Aucune erreur permise.*
2. **Identité & Alias** — citoyen ↔ numéros ↔ banque/wallet, KYC par niveaux,
   annuaire intelligent. *Le moat.*
3. **Connecteurs de rails** — agrégateur (Bizao/Julaya/CinetPay) payin/payout,
   banque, NFC. Frontière **ports & adapters** : le ledger n'importe jamais un
   SDK de rail. Adapter **simulé** d'abord, réels ensuite.
4. **Produits** — transfert intra, swap, paie B2B 1-clic, checkout e-commerce.
5. **Conformité & traçabilité** — tiers KYC, monitoring, reporting État.
   *Transversal, pas une couche finale.*

## 6. Ce qu'on garde / ce qu'on retire du repo

**On garde** : monorepo + infra (Postgres/Docker/Caddy/CI), backend Node/Fastify
(Valkey≈Redis, NATS≈RabbitMQ), et la **brique checkout / API marchand / webhooks
/ SDK `swimpay-node`** (= Checkout Universel).

**On retire (hors sujet)** : moteur de signaux, parsing notif-banque russe
(`bank-templates`), matching de signaux, **app Android receiver Kotlin** (25k
lignes). L'app grand public sera **refaite en Flutter**. `risk-core`/`shared-utils`
(vides) supprimés ou réaffectés.

## 7. Séquencement des sous-projets

> **MISE À JOUR 2026-08-27 (soir)** : après la recherche complète (`03`), la carte
> des problèmes (`04`) et la stratégie red-teamée (`05`), le premier produit est
> devenu **la facturation FNE pour PME** (pas le swap), et la V1 est **le cerveau
> à 4 modules** (`06`, `07`). Le tableau ci-dessous reflète l'état antérieur.

| # | Sous-projet | Statut |
|---|-------------|--------|
| 1 | **Socle Ledger** (recharge + transfert intra-SwimPay, simulation) | spec figée → voir `01_LEDGER_SOCLE_SPEC.md` |
| 2 | Identité & Alias (citoyen/N tél/1 banque, KYC tiers) | à spécifier |
| 3 | Swap OM↔Wave (payin+payout+float+rebalancing) | à spécifier |
| 4 | Paie B2B 1-clic | à spécifier |
| 5 | Checkout e-commerce (refonte sur la brique survivante) | à spécifier |
| — | Réécriture gouvernance (`AGENTS.md`/`README`/`docs`) au nouveau produit | à faire tôt (les règles actuelles contredisent le nouveau code) |

Règle : **une seule boucle argent-réel prouvée de bout en bout** avant d'élargir.
La spec de chaque sous-projet est le point de validation (cf. mandat d'exécution).
