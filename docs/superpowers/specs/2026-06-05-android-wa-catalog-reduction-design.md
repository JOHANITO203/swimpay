# Design — Android : réduction du catalogue West Africa à 3 fournisseurs CI

**Date :** 2026-06-05
**Statut :** Validé (approche A1)
**Périmètre :** app Android receiver uniquement (`apps/android-receiver`), + republication APK sur la landing.

## 1. Problème

Le backend prod (déployé 2026-06-05) ne reconnaît plus que 3 fournisseurs West Africa : `wave_ci`, `orange_money_ci`, `mtn_momo_ci` (migration 027 + registres contracts réduits). L'app Android affiche encore le catalogue de 10 fournisseurs (`WestAfricaReceivingCatalog.kt`), dont `wave_sn` mais **pas** `wave_ci`. Conséquence active : un marchand qui sélectionne un fournisseur retiré (Wave SN, Orange SN, Moov, Free Money, Wizall, Djamo, Ecobank, SG Connect) obtient un rejet `invalid_request` du backend à la création de la route.

## 2. Solution (approche A1 — réduction stricte)

Modifier le catalogue codé en dur, rien d'autre. Pas de catalogue piloté par le backend (rejeté : nouveau contrat API + cache offline disproportionnés), pas de nouvelle famille « wallet international » (sous-projet ultérieur).

### 2.1 Catalogue

`apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/WestAfricaReceivingCatalog.kt` — la liste `wallets` passe de 10 à 3 entrées :

| bankProfileId | displayName | country | branding |
|---|---|---|---|
| `wave_ci` | Wave | Côte d'Ivoire | reprend la couleur/monogram de l'ancien `wave_sn` (marque identique) |
| `orange_money_ci` | Orange Money | Côte d'Ivoire | inchangé |
| `mtn_momo_ci` | MTN MoMo | Côte d'Ivoire | inchangé |

Le commentaire d'en-tête (miroir de `WestAfricaReceiverBankProfiles`) est mis à jour pour mentionner la réduction CI.

### 2.2 Impacts UI

- Family chooser (`PremiumReceivingMethodFamilyChooser`) : l'aperçu « 6 premiers + +N » affiche simplement 3 badges, sans badge « +N » — vérifier que la logique tolère < 6 éléments (lecture seule, pas de refonte).
- `WestAfricaWalletGrid` et `PremiumWestAfricaReceivingScreen` : aucune modification de code attendue (itèrent le catalogue).
- Goldens Roborazzi : re-enregistrement (`npm run android:visual:accept`) — les captures qui montrent la grille WA changent légitimement.

### 2.3 Hors scope explicite

- Enum `ReceivingMethodType` (pas de variante WALLET ici).
- Famille « wallets internationaux » (Wise/Revolut/Payoneer) — sous-projet 4.
- Tout changement backend (déjà livré).

## 3. Livraison

1. Tests unitaires : `npm run android:test` (gradle `:app:testDebugUnitTest`, inclut Roborazzi verify).
2. Re-enregistrement des goldens impactés puis verify.
3. Build release : `npm run android:assemble:release`.
4. Publication : copie de l'APK vers `apps/landing/public/downloads/swimpay-merchant.apk`, commit (`chore(landing): publish latest receiver APK`) — le push sur main redéploie la landing via Dokploy.

## 4. Risques

| Risque | Mitigation |
|---|---|
| Marchands ayant déjà sélectionné un fournisseur retiré dans une ancienne APK | Le backend rejette proprement (`invalid_request`) ; 0 route existante en prod sur ces profils (vérifié 2026-06-05) |
| Goldens d'autres écrans cassés par le re-record | `android:visual:verify` sur l'ensemble ; n'accepter que les diffs des écrans WA |
| Signature release indisponible localement | Si les secrets de signature ne sont pas configurés, livrer l'APK en mode debug est interdit — escalader plutôt que dégrader |
