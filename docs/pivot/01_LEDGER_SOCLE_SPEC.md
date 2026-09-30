# Sous-projet 1 — Socle Ledger (spec à figer)

> **MISE À JOUR 2026-08-27 (soir)** : le séquencement a évolué après la recherche
> complète et le red-team (voir `05_BUILD_STRATEGY.md`). Le ledger complet
> double-entrée est **différé** au contrat distributeur (an 2) ; la V1 démarre en
> pass-through avec un socle allégé (journal d'intents + réconciliation) — voir
> `07_SPEC_CERVEAU_V1.md`. Ce document reste la référence du ledger complet pour
> la phase 2.

**But** : prouver la **custody** (SwimPay détient les fonds) avec le minimum de
dépendances externes, via une seule boucle argent-réel simulée de bout en bout :

```
Recharge (payin simulé) → solde SwimPay → transfert SwimPay→SwimPay (gratuit)
```

C'est la fondation sur laquelle swap, paie et checkout ne seront que des
écritures supplémentaires. Rails réels **hors scope** ici (aucun accès encore) —
mais la frontière d'intégration est posée pour qu'ils se branchent sans toucher
au ledger.

---

## 1. Principes non négociables

1. **Argent = entier en unité mineure.** Jamais de flottant. Devise **XOF**
   (zéro décimale : 1 unité mineure = 1 FCFA — déjà acquis dans le repo).
2. **Double-entrée stricte.** Tout mouvement = somme des débits == somme des
   crédits. Aucune écriture ne crée ni ne détruit de valeur.
3. **PostgreSQL = source de vérité.** Postings sous transaction + verrou de
   ligne. Pas de décision d'argent qui repose sur un lock Valkey seul.
4. **Immuable + auditable.** Une écriture postée ne se modifie ni ne se supprime.
   Une correction = une écriture inverse. Chaque opération émet un `audit_event`
   avec un reason code.
5. **Idempotence partout.** Toute opération d'argent porte une clé
   d'idempotence ; rejouer = même résultat, jamais un double débit.
6. **Conservation vérifiable en continu** :
   `Σ soldes wallets + Σ comptes de frais == Σ comptes de float`.

## 2. Modèle de données (esquisse — le détail va dans la migration)

Séparer dès maintenant les concepts, pour ne pas se peindre dans un coin quand
l'identité (sous-projet 2) se greffe :

- `account` — l'entité titulaire (citoyen / entreprise). *≠ numéro de téléphone.*
- `phone_number` — alias rattaché à un `account` (un compte peut en avoir N).
  KYC minimal ici : numéro + OTP. Le graphe complet « 1 citoyen / N tél / 1
  banque » est le sous-projet 2.
- `wallet` — solde d'un `account` dans une devise (`XOF`). Un seul par
  (account, devise) au socle.
- `ledger_account` — comptes du grand livre : `USER_WALLET:<id>`,
  `FLOAT_POOL:<rail>`, `FEE_REVENUE`, `SUSPENSE_IN_TRANSIT`. Typés (actif /
  passif) pour porter le sens double-entrée.
- `ledger_entry` — une écriture atomique = 2+ lignes (`posting`) équilibrées,
  horodatée, immuable, avec `idempotency_key` unique, `reason_code`, `type`.
- `posting` — une ligne (ledger_account, débit|crédit, montant mineur).
- `topup` — cycle de vie d'une recharge : `initiated → pending → confirmed |
  failed | expired`. Confirmé = déclenche l'écriture ledger.
- `audit_event` — trace immuable par transition.

## 3. Opérations (le contrat)

### 3.1 Recharge (payin simulé)
1. `POST /v1/topups` → crée un `topup` `pending` + une référence.
2. **Adapter de rail simulé** émet un webhook « paiement OK » (déclenché par un
   endpoint de test / un helper, pas par un vrai agrégateur).
3. À réception : écriture ledger atomique
   `débit FLOAT_POOL:sim / crédit USER_WALLET:<id>` (le float grandit du cash
   reçu, le wallet user est crédité). Frais de collecte **absorbés** au socle
   (gratuit pour l'user) → modélisés même si à 0 pour l'instant.
4. `topup → confirmed`, `audit_event`, notification.

*Le webhook simulé passe par la MÊME frontière que le futur webhook Bizao.*

### 3.2 Transfert intra-SwimPay (gratuit)
1. `POST /v1/transfers` `{from_account, to (phone|handle), amount_minor}` +
   `Idempotency-Key`.
2. Résolution destinataire (numéro/handle → account). Refus si inconnu.
3. Écriture atomique `débit USER_WALLET:from / crédit USER_WALLET:to`, **0 frais**.
4. Invariants : solde `from` suffisant (**jamais de solde négatif**), montant > 0,
   from ≠ to, clé d'idempotence respectée.
5. `audit_event` des deux côtés, notifications.

## 4. Frontière rails (ports & adapters)

Interface unique `RailConnector` (payin / payout / status / vérif webhook). Le
ledger et l'API ne dépendent que de cette interface.

- **Maintenant** : `SimulatedRailConnector` (in-process, déterministe, webhooks
  déclenchés par les tests / un helper de dev).
- **Plus tard** : `BizaoConnector`, `JulayaConnector` — aucun changement dans le
  ledger, seulement un nouvel adapter + config.

## 5. Discipline de test (on corrige la faiblesse du repo)

Le repo actuel teste l'API avec des repos **in-memory** → le SQL et les
migrations ne sont **jamais exercés**. Ici c'est **interdit** pour le ledger :

- Tests du ledger contre un **vrai PostgreSQL** (conteneur), migrations
  appliquées, postings réels.
- **Tests d'invariants / property-based** : après toute séquence d'opérations
  aléatoires valides, la **conservation** tient et **aucun solde n'est négatif**.
- Tests de **concurrence** : transferts parallèles sur le même wallet → pas de
  double dépense, pas de solde négatif (verrous corrects).
- Tests d'**idempotence** : rejouer une recharge / un transfert = un seul effet.
- Tests de la **frontière rail** via l'adapter simulé (payin → webhook → ledger).

## 6. Hors scope (explicite)

Swap, payout externe, float multi-rail réel, rebalancing, KYC niveau 2, graphe
d'identité complet, NFC, checkout, app Flutter, agrégateurs réels. Chacun est un
sous-projet ultérieur.

## 7. Critères d'acceptation (definition of done)

- [ ] Recharge simulée → wallet crédité, écriture double-entrée équilibrée,
      `topup` confirmé, audit émis.
- [ ] Transfert intra gratuit → débit/crédit atomiques, idempotent, refus si
      solde insuffisant ou destinataire inconnu.
- [ ] Invariant de conservation vérifié par un test property-based.
- [ ] Aucun solde négatif atteignable, y compris sous concurrence.
- [ ] Suite ledger verte contre un vrai PostgreSQL (pas de fake in-memory).
- [ ] Frontière `RailConnector` en place, un seul adapter (simulé) branché.

## 8. Décisions ouvertes à trancher avant de coder

1. **Emplacement du code** : nouveau package `packages/ledger-core` +
   endpoints dans `apps/api`, en gardant l'infra existante ? (recommandé)
2. **Réutilise-t-on les machines à états / contrats existants** comme base, ou
   repart-on d'un module propre pour ne pas traîner la sémantique « receiver /
   signal » ?
3. **Nom des reason codes / types d'écriture** : figer l'énumération dès le
   départ (l'AGENTS.md hérité interdit les magic strings — on garde cette règle).
