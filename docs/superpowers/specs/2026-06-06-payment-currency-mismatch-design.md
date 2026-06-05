# Design — Événement `payment.currency_mismatch`

**Date :** 2026-06-06
**Statut :** Validé
**Périmètre :** `packages/bank-templates` (extraction devise), `apps/signal-worker` (sonde croisée), `packages/events`, `apps/job-worker` (webhook public), `apps/api` + `packages/swimpay-node` (enregistrement du type), migration 028, docs.

## 1. Problème

Quand un signal bancaire arrive dans une devise différente de celle attendue par la session (ex. notification Sberbank ₽ alors que la session attend des XOF), le matching l'exclut **silencieusement** : la requête candidate filtre par devise, la décision est `wait`/`no_candidate`, aucune review n'est créée, la commande expire sans que le marchand sache qu'un paiement plausible est arrivé dans la mauvaise devise. De plus, le parseur n'extrait que RUB — un signal mobile money FCFA n'a même pas de devise.

## 2. Solution

### 2.1 Extraction de devise étendue (`packages/bank-templates/src/parser.ts`)

`extractCurrency(text)` passe de `'RUB' | null` à `'RUB' | 'XOF' | 'USD' | null` :

- RUB : marqueurs existants (₽, руб., RUB) — comportement inchangé.
- XOF : `FCFA`, `F CFA`, `XOF` (et `CFA` en garde-fou, borné par espace/ponctuation).
- USD : `$`, `US$`, `USD` — avec la même garde anti-dollar-préfixé que la détection display_price : un `$` précédé d'une lettre (`CA$`, `A$`) ne produit **pas** USD (→ null).
- Priorité en cas de multi-marqueurs : premier marqueur trouvé dans l'ordre RUB → XOF → USD ; texte contenant des marqueurs de devises **différentes** → null (jamais de devinette).
- `ParsedBankNotification.currency` s'élargit en conséquence ; `signal.currency` (colonne `notification_signals.currency`, TEXT nullable) reçoit la valeur telle quelle — aucun changement de schéma nécessaire pour ça.

### 2.2 Sonde croisée (`apps/signal-worker`)

Déclenchée UNIQUEMENT quand toutes ces conditions sont réunies :
1. la décision du matching est `wait` avec `reasonCodes` contenant `no_candidate` ;
2. `signal.currency` est non nul ;
3. le signal n'a pas déjà notifié de mismatch (dédup, cf. 2.4).

Requête (lecture seule) : sessions du même marchand, statuts actifs (mêmes statuts que la requête candidate existante), `currency != signal.currency`, ET (`reference_hmac` du signal égal à celui de la session OU `signal.amount_minor` égal à `payable_amount_minor`/`expected_amount_minor`). Première correspondance retenue ; `matched_on = 'reference'` prime sur `'amount'`.

**Le matching lui-même est inchangé** : le signal reste exclu, pas de review, pas de changement de scoring ni de `MatchConfidenceVector`.

### 2.3 Événements

- Interne : `EventTypes.SIGNAL_CURRENCY_MISMATCH = 'signal.currency_mismatch'` émis par le signal-worker avec `merchant_id`, `signal_id`, `order_id`, `external_id`, `payment_session_id`, `expected_currency`, `signal_currency`, `signal_amount_minor`, `expected_amount_minor`, `matched_on`.
- Public : le job-worker consomme l'événement interne et enqueue `payment.currency_mismatch` :

```json
{
  "type": "payment.currency_mismatch",
  "data": {
    "order_id": "ord_01",
    "external_id": "order_888",
    "payment_session_id": "ps_01",
    "expected_currency": "XOF",
    "signal_currency": "RUB",
    "expected_amount_minor": 1000,
    "signal_amount_minor": 1000,
    "matched_on": "reference",
    "official_bank_confirmation": false
  }
}
```

Aucun champ PII (pas de texte brut de notification, pas d'identifiant receveur, pas de signal_id public). Le garde-fou PII existant du job-worker s'applique inchangé.

### 2.4 Dédup / idempotence (migration 028)

`ALTER TABLE notification_signals ADD COLUMN IF NOT EXISTS currency_mismatch_notified_at TIMESTAMPTZ;` — renseignée à l'émission de l'événement interne ; la sonde saute les signaux déjà notifiés. Un signal produit au plus un événement (même si plusieurs sessions croisées correspondent : on notifie la première par date de création de session).

### 2.5 Enregistrement du type public

- `PublicWebhookEventType` (job-worker) et `PUBLIC_V1_WEBHOOK_EVENTS` (api) gagnent `'payment.currency_mismatch'`.
- **Nouvelles** provisions d'intégration : activé par défaut (inclus dans les `enabled_events` par défaut).
- Endpoints **existants** : inchangés (leur tableau `enabled_events` en base ne contient pas le nouveau type → ils ne le reçoivent pas) ; activation possible via l'API de gestion des endpoints existante. Pas de backfill.
- SDK `packages/swimpay-node` : union de types + helpers de vérification mis à jour.

## 3. Hors scope explicite

- Aucune review créée, aucun changement du scoring/filtrage du matching.
- Pas de backfill des `enabled_events` existants.
- Pas de conversion/équivalence FX dans la comparaison de montants (égalité entière brute uniquement — l'événement est informatif, le marchand juge).
- Pas d'UI (dashboard/Android) — l'événement est webhook-only à ce stade.

## 4. Tests

- Parser : golden cases RUB (non-régression), FCFA/XOF, $/US$/USD, garde `CA$`→null, multi-devises→null, bornage (pas de faux positif sur « CFAO » ou « USDT » — vérifier les bornes de mots).
- Sonde : hit par référence, hit par montant, priorité référence>montant, aucun hit → pas d'événement, dédup (2ᵉ passage → rien), signal sans devise → pas de sonde.
- Job-worker : événement interne → webhook public enqueued avec payload exact ; garde-fou PII passe.
- Provisioning : nouvelle intégration → `payment.currency_mismatch` dans `enabled_events` et `public_webhook_events`.
- E2E durable-worker si le harnais le permet.

## 5. Risques

| Risque | Mitigation |
|---|---|
| Faux positifs par égalité de montant entre devises (1000 RUB minor = 1000 XOF minor) | `matched_on: 'amount'` exposé — le marchand voit la base de la corrélation ; référence prioritaire ; événement purement informatif |
| Bruit pour marchands multi-devises | La sonde ne tourne que si AUCUN candidat même-devise n'existe (`no_candidate`) |
| `extractCurrency` faux positifs sur du texte marketing | Bornage strict par espaces/ponctuation, garde anti-préfixe, multi-devises → null |
| Endpoints existants ne reçoivent pas l'événement | Choix assumé (opt-in) — documenté dans 12_WEBHOOKS.md |
