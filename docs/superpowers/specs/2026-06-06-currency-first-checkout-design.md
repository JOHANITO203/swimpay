# Design — Checkout devise-first (choix de devise acheteur, routeur FX multi-source, réconciliation par devise)

**Date :** 2026-06-06
**Statut :** Validé (réponses utilisateur : étape dédiée en tête · source de taux RUB ajoutée · plafond delta ≤1 % · extras : double devise + fix review-list + devise choisie dans le webhook)
**Périmètre :** `apps/api` (fx, payment-sessions, orders, reviews, server), `apps/web` (checkout), `packages/contracts` (états/réconciliation), migration 029, webhook additif, docs. **Hors périmètre :** Android, SDK (types additifs seulement si trivial), matching, création d'ordre (gate inchangé).

## 1. Problème

La devise d'une session est figée à la création de l'ordre ; l'acheteur subit le rail. Modèle PSP visé : l'acheteur **choisit la devise dans laquelle il paie**, ce choix détermine les rails (∩ rails configurés du marchand). Bénéfice secondaire : le SDK marchand n'a plus à deviner le rail — l'acheteur fait le travail.

Contraintes factuelles : la BCE (frankfurter) ne cote pas le RUB depuis 2022 ; le XOF est un peg fixe `655.957 XOF / 1 EUR` (parité légale UEMOA) ; le delta de réconciliation actuel (+1–99 unités mineures, `payable = display + delta`, `orders.ts:369`) est aveugle à la devise (jusqu'à ~10 % sur un petit montant USD/XOF).

## 2. Étape `currency` du checkout

- Nouveau pas en tête : `intro → currency_selection → receiver_bank_selection → … (inchangé)`.
- **Sautée automatiquement** quand une seule devise est payable (comportement par défaut, non configurable).
- Devises proposées = `receivable_currencies` du marchand ∩ {devises cotables depuis la devise de la session} ∪ {devise courante de la session}.
- Chaque option affiche le **montant coté** (« Payer 999 ₽ », « Payer 13,45 $ », « Payer 6 100 FCFA ») + la mention double devise (« ≈ base »).
- Re-choix possible tant qu'aucune route de réception n'est verrouillée (`selectedReceivingRouteId` nul) ; ensuite l'étape n'est plus proposée.
- i18n fr/en/ru, mêmes conventions que l'étape rail-aware existante.

### Endpoints

- `GET /v1/checkout/:id/payable-currencies` → `{ currencies: [{ currency, amount_minor, formatted, is_current, quote?: { rate, source, base_currency, base_amount_minor } }] }` — cotation à la volée (cache FX 1 h), les devises non cotables sont omises (la devise courante est toujours présente, sans quote).
- `POST /v1/checkout/:id/currency { currency }` → recote la session (cf. §4). Erreurs : `currency_not_payable` (400), `route_already_locked` (409), `fx_rate_unavailable` (409).

## 3. Routeur FX multi-source (`apps/api/src/fx.ts` étendu)

| Graphe | Source | Contenu |
|---|---|---|
| BCE | frankfurter.dev (existant) | pivot EUR, ~30 devises dont USD — PAS de RUB ni XOF |
| CBR | `https://www.cbr.ru/scripts/XML_daily.asp` (XML quotidien officiel, gratuit, sans clé) | pivot RUB : `Value/Nominal` = RUB par unité (décimale à virgule — parser en conséquence) |
| Peg UEMOA | constante `655.957` | XOF par EUR, fixe |

`FxRateService` devient `FxRouter` (ou conserve son nom avec une méthode généralisée `quote(source, target, amountMinor, minorDigits)`) :

- Chemins : composition d'au plus **2 pivots** (EUR, RUB). Exemples : EUR→USD (BCE direct) ; EUR→RUB (CBR direct, sens inverse de la cote CBR) ; RUB→XOF (CBR inverse → EUR → peg) ; USD→RUB (CBR direct : la cote CBR liste USD) ; XOF→USD (peg inverse → BCE).
- **Un seul arrondi final** half-up sur le montant cible (multiplication composée des taux, jamais d'arrondi intermédiaire).
- Mêmes règles que l'existant : cache 1 h par (source,graphe), stale toléré 24 h, indisponible → la devise est simplement **omise de la liste** (et `fx_rate_unavailable` sur un POST explicite). Jamais de taux inventé.
- Trace de cote : `{ rate: string (taux composé), source: 'ecb' | 'cbr' | 'uemoa_peg' | combinaison 'ecb+uemoa_peg' etc., rateTimestamp }`.
- `quoteToUsd` existant conservé (délègue au routeur) — la création d'ordre ne change pas.

## 4. Mécanique de session (migration 029)

L'ordre conserve sa devise/montant de base. À la sélection d'une devise par l'acheteur, la session est **recotée** :

- `payment_sessions.currency` ← devise choisie (ce champ pilote déjà launchers, routes, leases, matching — l'aval suit sans modification).
- `expected_amount_minor` ← montant converti ; `display_amount_minor`/`payable_amount_minor`/lease recalculés selon la mécanique existante (le lease précédent est libéré).
- Nouvelles colonnes (029, toutes nullable) : `base_currency`, `base_amount_minor`, `buyer_fx_rate TEXT`, `buyer_fx_source TEXT`, `buyer_fx_timestamp TIMESTAMPTZ`, `currency_selected_at TIMESTAMPTZ`. `base_*` figées à la PREMIÈRE sélection (= devise/montant de session à la création) pour permettre les re-choix sans dérive (chaque recote part de la base, pas de la devise précédente).
- La cote est **verrouillée** jusqu'à `valid_until` (pas de re-cotation implicite ; un re-choix explicite recote).
- Sélections suivantes : autorisées tant que `selectedReceivingRouteId` est nul.

Gate de création d'ordre **inchangé** (la devise résolue doit être receivable) — l'étape devise offre les AUTRES devises receivables ensuite.

## 5. Réconciliation par devise (plafond relatif ≤1 %)

`maxDelta = min(99, max(1, floor(displayAmountMinor / 100)))` ; `delta = 1 + (seed % maxDelta)` — même seed déterministe qu'aujourd'hui (`deriveReconciliationDeltaMinor`). RUB ≥ 99 ₽ : comportement identique à l'existant ; petits montants USD/XOF : delta borné à 1 % du montant. S'applique partout où le delta est dérivé (contracts + tout doublon côté api — vérifier `normalizeReconciliationDelta`).

## 6. Extras embarqués

1. **Double devise** : partout où le checkout affiche le montant payable et que `base_currency` diffère, afficher « ≈ {base} » (étape devise, aperçu, instructions). Formatage minor-digits par devise (0 pour XOF).
2. **Fix review-list** : `apps/api/src/reviews.ts` — les 4 appels `formatAmountMinor(item.*Minor)` passent `item.currency` (bug préexistant, faux pour XOF).
3. **Webhook** : bloc additif `buyer_currency_selection` dans `payment.confirmed` quand une sélection a eu lieu : `{ selected_currency, base_currency, base_amount_minor, fx_rate, fx_source, fx_rate_timestamp }` — uniquement des valeurs déjà non-PII ; absent sinon. (Threading via la SELECT de reviews comme `currency_detection`.)

## 7. États checkout

`CheckoutSessionStates` (contracts) gagne `currency_selection` (entre `buyer_identity` et `receiver_bank_selection`) ; `mapPaymentSessionToCheckoutState` retourne cet état quand ≥2 devises payables et aucune sélection/route verrouillée. Le web rend l'étape sur cet état. Sessions existantes (mono-devise) : état jamais atteint — rétrocompatible.

## 8. Tests

- Routeur FX : chaque chemin de composition (direct BCE, CBR direct/inverse, peg, 2-pivots), parsing XML CBR (virgule décimale, Nominal>1 ex. JPY nominal 100), cache/stale/indisponible par graphe, un-seul-arrondi (cas adversarial vs double arrondi).
- Endpoints : liste cotée (omission des non-cotables), sélection heureuse, re-choix, `route_already_locked`, `currency_not_payable`, `fx_rate_unavailable`.
- Session : recote → leases libérés/recréés dans la nouvelle devise, `base_*` figés au premier choix, matching candidate query suit la nouvelle devise.
- Réconciliation : table de cas par devise/montant (RUB 1000₽, USD $5, XOF 500F, bornes 1 et 99).
- Web : étape devise (3 langues), saut automatique mono-devise, double devise aux 3 points d'affichage.
- Webhook : bloc présent/absent ; reviews fix ; non-régression complète.

## 9. Risques

| Risque | Mitigation |
|---|---|
| Disponibilité API CBR | cache 1 h + stale 24 h + omission silencieuse de RUB de la liste (jamais bloquant) |
| Dérive FX entre choix et paiement | cote verrouillée jusqu'à expiration de session (15 min par défaut) — fenêtre courte, taux tracé |
| Double arrondi base→EUR→XOF | multiplication composée, un seul arrondi final, test adversarial dédié |
| Re-choix après mémorisation du montant par l'acheteur | re-choix bloqué dès qu'une route est verrouillée ; le montant affiché est toujours celui de la session courante |
| Collision de leases lors de la recote | libération explicite du lease précédent avant recréation (transaction) |

## 10. Déploiement

Migration **029 avant le code** (colonnes nullable — code ancien indifférent). Push = déploiement Dokploy. Aucun impact marchand existant tant qu'un seul `receivable_currency` (étape sautée).
