# Design — Checkout web : rendu par rail (mobile_money + wallet USD)

**Date :** 2026-06-05
**Statut :** Validé (approche B1)
**Périmètre :** `apps/web/src/screens/CheckoutScreen.ts` + `apps/web/src/checkout.test.ts`. Aucun changement backend (les données nécessaires sont déjà servies).

## 1. Problème

Le rendu du checkout est binaire (`isPhone` → téléphone, sinon carte) :

- Un acheteur **XOF** (route `mobile_money`) voit des icônes/libellés « carte » — gap live depuis la Phase 2 WA.
- Un acheteur **USD** (route `wallet_transfer`, nouvelle en prod) tomberait dans le même piège : identifiant Wise/Revolut/Payoneer présenté comme un numéro de carte.
- `filterRoutesForSession` ne filtre que `card`/`sbp` : les routes mobile_money/wallet ne sont pas associées à leur méthode.

## 2. Solution (approche B1 — descripteur par rail)

### 2.1 Table de descripteurs

Dans `CheckoutScreen.ts`, remplacer les branchements `isPhone` par une table :

```
rail_type → {
  method: 'sbp' | 'card' | 'mobile_money' | 'wallet',
  icon: 'phone' | 'card' | 'mobile' | 'wallet',
  methodLabelKey, destinationLabelKey, copyLabelKey
}
```

couvrant `phone_transfer`, `card_transfer`, `mobile_money`, `wallet_transfer`. Pour `wallet_transfer`, le libellé de destination s'adapte à `receiver_identifier_type` (`email` → « adresse e-mail du wallet », `tag` → « tag du wallet », `phone` → « numéro lié au wallet », dans les 3 langues).

### 2.2 Points de rendu convertis (4)

| Point | Lignes actuelles | Changement |
|---|---|---|
| `filterRoutesForSession` | ~611-618 | gère les 4 rails (méthode sélectionnée ↔ rail) |
| Sélection de route | ~1007-1024 | icône + libellé issus du descripteur |
| Étape instructions | ~1082-1120 | libellés destination/copie issus du descripteur |
| Aperçu instruction | ~1346-1358 | idem |

`renderPayerLauncherSelection` est déjà générique (les launchers USD arrivent par `payer-bank-launchers`) — aucun changement.

### 2.3 i18n

Objets `fr`/`en`/`ru` du fichier : ajout de ~8 clés par locale (méthode mobile money, méthode wallet, destinations par type d'identifiant, libellés de copie). Aucune chaîne en dur hors table.

### 2.4 Icônes

`iconSvg` (~1541-1564) : + `mobile` (téléphone mobile stylisé) + `wallet` (portefeuille), SVG inline cohérents avec les existants (trait, viewBox).

### 2.5 Tests

- `FakeCheckoutSessionProvider` : + 1 route `mobile_money` (XOF, masked `+••• ••• ••67`) + 1 route `wallet_transfer` (USD, `receiver_identifier_type: 'email'`, masked `j•••@•••.com`).
- Assertions : libellés corrects aux étapes route/instructions dans les 3 langues pour les 2 nouveaux rails ; non-régression des parcours phone/carte existants (suite actuelle inchangée).
- Cas launcher USD : la session USD liste wise_int/revolut_int/payoneer_int (déjà couvert côté contracts ; assertion d'intégration légère côté web).

## 3. Hors scope explicite

- Affichage double devise « €9.99 ≈ $10.84 » (le checkout n'a pas la devise d'origine dans sa session — enrichissement futur).
- `payment.currency_mismatch`, parsers néobanques, Android.
- Refonte du flux ou des étapes (la séquence intro → bank → route → launcher → instructions → waiting est inchangée).

## 4. Livraison & risques

- `npm test` (suite web 3 langues × 4 rails) + typecheck + lint avant merge.
- ⚠️ **Merger = déployer** (Dokploy redéploie sur push main) — la couverture de tests est la condition de mise en prod.
- Risque : régression visuelle des parcours RU existants — mitigé par les assertions de non-régression et le fait que phone/card passent par la même table (valeurs identiques aux libellés actuels).
