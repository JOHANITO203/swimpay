# Design — Détection de devises, conversion USD, rail néobanques, réduction West Africa

**Date :** 2026-06-05
**Statut :** Validé (design approuvé par le product owner)
**Périmètre :** `packages/contracts`, `apps/api`, migration DB 026, webhooks (`apps/job-worker`), surfaces checkout/Android (impacts listés, implémentation UI en phases ultérieures)

---

## 1. Objectif

SwimPay détecte la devise des produits depuis la surface marchande où il est intégré (shop in-app), via le prix formaté tel qu'affiché. Trois devises sont natives et optimisées : **RUB**, **USD**, **XOF**. Toute autre devise détectée (EUR, GBP, …) est **convertie en USD au taux de change courant**. Une fois la devise finale connue, l'ordre est apparié à la route de réception correspondante du marchand et le payload webhook est adapté (trace de détection + route de réception).

En parallèle :

- Le rail **USD** est créé via des **néobanques internationales** (Wise, Revolut, Payoneer).
- Les acteurs **West Africa** sont réduits à **3 acteurs Côte d'Ivoire** : Wave CI, Orange Money CI, MTN MoMo CI — des deux côtés (launchers payeur et profils receveur).

## 2. État actuel (audit)

- `ACCEPTED_ORDER_CURRENCIES = {RUB, XOF, XAF}` (`apps/api/src/orders.ts:2710`). USD est parsé mais refusé à la création d'ordre. La devise est explicite dans `POST /v1/orders` ; aucune détection n'existe.
- Symétrie devise→rail déjà en place : `payerLaunchersForCurrency()` (`packages/contracts/src/index.ts:490-502`) route RUB → banques russes, XOF/XAF → mobile money WA. `receivingCurrencyForBankProfile()` (`index.ts:117-119`) déduit la devise de réception d'un profil bancaire.
- Invariant existant : un marchand ne peut créer un ordre que dans une devise pour laquelle il a une route de réception active (`merchant_currency_route_required`, `apps/api/src/server.ts:1331`).
- Webhooks sortants uniquement (`payment.confirmed/rejected/expired`), 7 retries exponentiels, signature HMAC. La devise figure dans le payload mais sans métadonnées de détection ni de routage.
- Registres WA actuels (10 entrées) : `orange_money_sn`, `orange_money_ci`, `wave_sn`, `mtn_momo_ci`, `moov_money_ci`, `free_money_sn`, `wizall_sn`, `djamo_ci`, `ecobank_ci`, `sg_connect_ci`. **`wave_ci` n'existe pas** (seul `wave_sn` est défini).
- Aucune source FX, aucune notion de banque internationale, aucun rail USD.
- SwimPay n'est pas un PSP : la confirmation vient des notifications bancaires captées par le receiver Android du marchand.

## 3. Architecture retenue (Approche A)

Détection **côté serveur** via un champ optionnel `display_price` sur `POST /v1/orders`. Source de vérité unique, un seul round-trip, rétrocompatibilité totale (le champ `amount` explicite prime s'il est présent). Les alternatives rejetées : détection côté SDK client (pas de source de vérité serveur) et endpoint de détection dédié (deux round-trips, surface API inutile).

### 3.1 Module de détection (`packages/contracts`)

Fonction pure `detectCurrencyFromDisplayPrice(input: string): CurrencyDetectionResult` — zéro I/O, testable isolément, partagée par toutes les surfaces.

**Tables de détection optimisées (devises natives) :**

| Devise | Marqueurs reconnus | Format montant |
|--------|-------------------|----------------|
| RUB | `₽`, `руб.`, `руб`, `р.`, `RUB` | 2 décimales ; séparateurs `1 000,50`, `1000.50` |
| USD | `$`, `US$`, `USD` | 2 décimales ; `1,000.50` |
| XOF | `FCFA`, `F CFA`, `CFA`, `XOF` | 0 décimale ; `1 000` |

**Devises convertibles** (détectées, non natives) : `€`/`EUR`, `£`/`GBP`, `XAF`, et tout code ISO-4217 reconnu → `{ currency, amount_minor, needs_conversion: true }`.

**Règles strictes :**

- Montant sans symbole ni code (ex. `"1000"`) → erreur `currency_detection_ambiguous`. On ne devine jamais.
- `$` seul = USD. Politique explicite et documentée (CAD/AUD non supportés en symbole nu ; `CA$`, `A$` sont rejetés comme ambigus en V1).
- Le parsing des séparateurs gère `1 000,50` (espace + virgule), `1,000.50` (virgule + point), `1.000,50` (point + virgule) ; les cas indécidables sont rejetés.

**Résultat :** `{ currency: string, amount_minor: number, needs_conversion: boolean, raw_input: string }`.

### 3.2 Service FX (`apps/api/src/fx.ts`, nouveau)

- **Provider :** frankfurter.dev (taux BCE, gratuit, sans clé API). Conversion uniquement **vers USD**.
- **Cache :** Valkey, TTL 1 h ; tolérance stale 24 h maximum.
- **Indisponibilité :** taux absent ou périmé > 24 h → rejet de l'ordre avec `fx_rate_unavailable`. Aucun taux inventé, aucun fallback hardcodé.
- **Arrondi :** half-up vers le cent USD.
- **Traçabilité :** l'ordre stocke `original_currency`, `original_amount_minor`, `fx_rate` (décimal texte), `fx_rate_timestamp`.

### 3.3 Pipeline de création d'ordre (`apps/api`)

- `POST /v1/orders` accepte `display_price: string` (optionnel). Précédence : `amount` explicite prime ; sinon `display_price` est requis et parsé. Ni l'un ni l'autre → erreur de validation existante.
- Flux : `display_price` → détection → devise native (RUB/XOF/USD) → ordre dans cette devise ; devise convertible → conversion FX → ordre en **USD** avec trace.
- `ACCEPTED_ORDER_CURRENCIES` devient `{RUB, XOF, XAF, USD}`. Note XAF : il reste accepté en `amount` **explicite** (rétrocompatibilité avec l'existant Phase 2) ; mais via `display_price`, seuls RUB/USD/XOF sont natifs — un prix détecté en `XAF` est traité comme convertible → USD, conformément à la règle « natif = RUB/USD/XOF uniquement ». (`FCFA` nu est détecté comme XOF.)
- L'invariant `merchant_currency_route_required` s'applique à la **devise finale** (post-conversion). Mécanique Phase 2 WA réutilisée telle quelle — aucun système parallèle.

### 3.4 Rail USD — néobanques internationales (`packages/contracts` + migration 026)

**Profils receveurs** `InternationalReceiverBankProfiles` :

| ID | Nom | Rail | Identifiant | Statut |
|----|-----|------|-------------|--------|
| `wise_int` | Wise | `wallet_transfer` | email ou Wisetag | `review_required_beta`, `detection_supported: false` |
| `revolut_int` | Revolut | `wallet_transfer` | téléphone ou Revtag | idem |
| `payoneer_int` | Payoneer | `wallet_transfer` | email | idem |

**Launchers payeur** `InternationalPayerBankLauncherRegistry` : Wise (`com.transferwise.android`), Revolut (`com.revolut.revolut`), Payoneer — stratégie `package_hint_only`, `not_validated` (même convention que les launchers WA non validés).

**Extensions de schéma (migration 026) :**

- `rail_type` : + `wallet_transfer` (contrainte CHECK de `merchant_receiving_routes`).
- `receiver_identifier_type` : + `email`, + `tag` (contrainte CHECK). Normalisation : email lowercase/trim ; tag trim + préfixe `@` retiré. Masquage email : `j•••@•••.com` ; masquage tag : `@w•••67`.
- `orders` : + `original_currency`, `original_amount_minor`, `fx_rate`, `fx_rate_timestamp` (nullable ; renseignés uniquement si conversion).

**Branchements :** `payerLaunchersForCurrency('USD')` → registre international ; `receivingCurrencyForBankProfile()` → `'USD'` pour `wise_int`/`revolut_int`/`payoneer_int` ; logos via `bankLogoAssetKey()` (nouveaux assets `ic_bank_wise`, `ic_bank_revolut`, `ic_bank_payoneer`).

### 3.5 Réduction West Africa (les deux côtés)

| Action | Détail |
|--------|--------|
| Garder | `orange_money_ci`, `mtn_momo_ci` |
| Créer | `wave_ci` — package `com.wave.personal`, stratégie deeplink (comme `wave_sn`), logo `ic_bank_wave` réutilisé |
| Retirer des registres | `orange_money_sn`, `wave_sn`, `free_money_sn`, `wizall_sn`, `moov_money_ci`, `djamo_ci`, `ecobank_ci`, `sg_connect_ci` |

- Appliqué aux **deux** registres : `WestAfricaPayerBankLauncherRegistry` et `WestAfricaReceiverBankProfiles`.
- **Aucune suppression destructive en DB** : migration de soft-disable — les profils retirés passent indisponibles à l'enregistrement ; les `merchant_receiving_routes` existantes qui les référencent passent en `lifecycle_status = 'pending_disable'` (jamais `deleted`).
- Android : les family cards WA (commit dafce5d) reflètent les 3 acteurs CI.

### 3.6 Webhook adaptatif (`apps/job-worker`)

Champs **additifs** (rétrocompatibles) dans le payload `payment.confirmed` :

```json
{
  "currency": "USD",
  "amount_minor": 1084,
  "currency_detection": {
    "source": "display_price_parsed",
    "raw_input": "€9.99",
    "original_currency": "EUR",
    "original_amount_minor": 999,
    "fx_rate": "1.0852",
    "fx_rate_timestamp": "2026-06-05T10:00:00Z"
  },
  "receiving_route": {
    "route_code": "usd-wise-main",
    "rail_type": "wallet_transfer",
    "bank_profile_id": "wise_int",
    "receiver_identifier_masked": "j•••@•••.com"
  }
}
```

- `currency_detection.source` : `"display_price_parsed"` ou `"explicit"`. Les sous-champs `original_*`/`fx_*` ne sont présents que si une conversion a eu lieu.
- `receiving_route` expose le routage devise→route déjà verrouillé au moment du lock de session ; uniquement des valeurs masquées, jamais d'identifiant brut.
- Aucun nouveau type d'événement (YAGNI).

## 4. Features induites prédites, par surface

| Surface | Features qui naissent de cette feature |
|---------|----------------------------------------|
| API | `display_price`, erreurs `currency_detection_ambiguous` / `fx_rate_unavailable`, profils internationaux dans `/receiver-banks` et `/payer-bank-launchers` |
| Checkout web | Écran de paiement USD (instructions Wise/Revolut/Payoneer), affichage double devise « €9.99 ≈ $10.84 » |
| Android receiver | Enregistrement de méthode wallet (email/tag), futurs parsers de notifications Wise/Revolut, family cards WA réduites à 3 |
| Dashboard merchant | Création/gestion de routes USD néobanques |
| Webhooks | Blocs `currency_detection` + `receiving_route` |
| Futur probable (hors scope) | Événement `payment.currency_mismatch` (devise du signal ≠ devise attendue), spread/markup FX administrable, devises natives additionnelles |

## 5. Hors scope (explicitement)

- Détection de devise côté signal entrant Android (parsing ₽/FCFA/$ dans les notifications) — futur probable, non requis ici.
- Parsers de notifications des néobanques (confirmation USD = review manuel, comme WA).
- Spread/markup FX, multi-devises de règlement, conversion vers autre chose que USD.
- Suppression physique des profils WA retirés ou des routes marchandes associées.

## 6. Tests et vérification

- **Unitaires (contracts)** : golden cases de parsing — formats RUB/USD/XOF/EUR valides, séparateurs (`1 000,50`, `1,000.50`, `1.000,50`), ambiguïtés rejetées (`"1000"`, `CA$`), 0 décimale XOF, codes ISO.
- **Unitaires (api)** : FX cache hit/miss/stale/indisponible, arrondi half-up, précédence `amount` > `display_price`.
- **E2E** : `display_price: "€9.99"` → ordre USD (trace FX) → route `wise_int` appariée → webhook enrichi ; `display_price: "1 000 FCFA"` → ordre XOF → route mobile money CI ; marchand sans route USD → `merchant_currency_route_required`.
- **Migration 026** : up/down réversible ; routes sur profils retirés → `pending_disable` ; contraintes CHECK étendues.
- Build + suite de tests existante verte (non-régression RUB/XOF).

## 7. Risques

| Risque | Mitigation |
|--------|------------|
| Fiabilité des notifications néobanques pour la confirmation | `review_required_beta` + `detection_supported: false` (review manuel, comme WA) |
| Dépendance FX externe | Cache 1 h + stale 24 h + rejet explicite `fx_rate_unavailable` |
| `$` ambigu (CAD/AUD) | Politique « `$` = USD » documentée ; `CA$`/`A$` rejetés |
| Routes marchandes existantes sur profils WA retirés | Soft-disable (`pending_disable`), jamais de delete |
| Variation FX entre création d'ordre et paiement | Taux figé à la création, tracé dans l'ordre et le webhook |
