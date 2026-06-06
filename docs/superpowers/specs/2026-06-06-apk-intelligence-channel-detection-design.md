# Design — APK intelligence & détection par channel ID (néobanques + WA + RU)

**Date :** 2026-06-06
**Statut :** Validé (reshape du sous-projet 4 après redirection : détection channel-ID+cert d'abord / texte en appoint ; harvest complet 3 familles ; tests via injecteur synthétique). **Supersède** `2026-06-06-neobank-notification-parsers-design.md` (dont le parser texte EN + les profils INT, déjà mergeables, deviennent la couche « appoint »).

## 1. Constat & réorientation

La revue du parser texte a produit un **faux positif critique** (« We sent you a verification code » → argent reçu). Leçon : **le texte est fragile**. Deux signatures fiables existent et ne sont pas exploitées :
1. **Cert de signature** (SHA-256) = l'app est authentique (déjà pinné via `bank_app_signatures`, mais cert attendu non pré-rempli pour la plupart).
2. **Notification channel ID** (`channelId`, ex. `transfers`) = la notif est du **bon type** — stable, survit au texte composé serveur. **Capté device-side** (`NotificationSnapshot.channelId`) mais **ni uploadé ni utilisé**.

Nouvelle règle de détection : une notif est candidate-paiement si **package ∈ profil** ET **(channelId ∈ channels-paiement connus du profil OU le matcher texte touche)**. Le channel ID connu **élève la confiance** ; un channel inconnu + texte qui touche → **learning** (le channel est enregistré `pending` pour revue). Le texte ne sert plus qu'à **extraire** montant/expéditeur/référence, pas à décider seul.

## 2. Harvest « APK intelligence » (3 familles, hors-repo, documenté)

Pipeline outillé (aapt2 + apksigner + dexdump, tous présents ; pas d'apktool requis) sur chaque app :
- **Cert** : `apksigner verify --print-certs` → SHA-256 du V3 signer (ignorer le Source Stamp apkpure `3257d599…`).
- **Channel IDs** : `dexdump` des `classes*.dex` → repérer les `createNotificationChannel`/`NotificationChannel` et les littéraux de channel adjacents (best-effort ; obfuscation R8 possible → marqué `extraction_incomplete`).
- **Deeplinks** : manifest via le script existant `apk-deeplink-harvest.sh` (déjà fait pour WA ; à faire pour néobanques + RU).

Apps : néobanques (Wise ✅cert, Revolut ✅cert, Payoneer ❌→source alternative APKMirror/adb), WA (`com.wave.personal`, `com.orange.myorange.oci`, `mtnft.momo.consumer`), RU (6 packages du registre). Résultats consolidés dans `docs/APK_INTELLIGENCE.md` (vérité honnête par cellule : APK / dexdump / observé / introuvable). Les certs apkpure = **cert attendu** seulement, jamais auto-trust prod.

## 3. Câblage channel-ID (device → backend → matching)

- **Device** : `SignalUploadWorker` inclut `channelId` du snapshot dans le payload uploadé (le champ existe déjà côté snapshot).
- **Contrat signal** (`apps/api/src/signals.ts`) : `ReceiverSignalRequestBody` += `channel_id?: string` ; persisté sur `notification_signals.channel_id` (migration 031).
- **Modèle de données** : `bank_notification_channels (bank_profile_id, channel_id, status pending|confirmed|rejected, first_seen_at, confirmed_at, sample_count)` (migration 031). Pré-seedé depuis le harvest (`confirmed` pour ce que le dexdump donne sûrement ; sinon rien) ; un signal portant un channel inconnu sur un profil détecté insère/incrémente une ligne `pending` (apprentissage), jamais bloquant.
- **Reconnaissance** : un helper `isKnownPaymentChannel(bankProfileId, channelId)` ; intégré au scoring (`channel_recognized` reason code, bonus de confiance) et à la décision candidate-paiement.

## 4. Parser (texte = appoint)

Reprend la couche texte du sous-projet 4 (chemin INT anglais + profils INT learning, déjà commités) **plus le fix du faux positif OTP** : `INTL_NOISE_KEYWORDS` += `verification`, `code`, `one-time`, `otp`, `passcode`, `reminder` ; et `sent you` ne déclenche `incoming` que si un **montant** est présent. `extractUsdAmountMinor` : corriger le cas 3-décimales (`10.999 USD` → null, pas 99900). Le texte fournit montant/devise/réf ; le channel ID fournit la nature.

## 5. Activation & profils

`detection_supported: true` pour wise/revolut/payoneer (assist review, jamais auto-confirm). Migration 030 (certs néobanques) + 031 (channel_id + table channels). Le cert-pinning généralisé WA/RU : pré-remplir `bank_profiles.package_cert_sha256` avec les certs harvestés (migration 032), le flux `bank_app_signatures` pending→operator inchangé.

## 6. Tests (injecteur synthétique)

- `DebugSyntheticNotificationSource` piloté avec des tuples harvestés `(package, channelId, texte)` sur émulateur → valide capture → parser → upload → matching backend, y compris la voie channel-recognized.
- bank-templates : golden EN (+ fix OTP + 3-décimales), non-régression RU.
- backend : signal avec channel connu → bonus/reason ; channel inconnu → ligne `pending` créée, signal toujours traité ; non-régression RU/XOF.
- Android : `BankTargetLock` +3 néobanques ; `channelId` présent dans le payload uploadé (test du worker).
- contracts : detection_supported ×3.

## 7. Découpage en sous-projets (le « passage complet » est gros — on le phase)

- **4a (ce cycle)** : néobanques — harvest complet (certs+channels+deeplinks, Payoneer inclus via source alt), câblage channel-ID device→backend→matching+modèle, parser appoint+fixes, detection_supported, migrations 030/031, APK, tests.
- **4b (cycle suivant)** : harvest WA + RU (certs+channels+deeplinks) → migration 032 cert-pinning généralisé + seed channels + deeplinks SDK. Mécanique identique à 4a, données en plus.

## 8. Risques

| Risque | Mitigation |
|---|---|
| Channel IDs obfusqués (R8) non extractibles statiquement | learning : le device capte le channelId réel → table `pending` → confirmation opérateur ; le harvest est un bonus, pas un prérequis |
| Cert apkpure ≠ Play | cert attendu seulement ; pending→operator inchangé |
| Payoneer introuvable sur apkpure | source alternative (APKMirror/adb) ou learning-only |
| Faux positif texte résiduel | channel-ID gate en amont + fix OTP/3-décimales ; texte ne décide plus seul |
| Volume harvest 12 apps | phasé 4a/4b ; pipeline scripté |

## 8bis. Arbitrages résolus (2026-06-06, après harvest local complet)

- **Harvest local complet** : les 13 APK fournis par l'opérateur ont livré les certs de **tous** les profils SwimPay (RU : sber/tbank/vtb/alfa/gazprombank/ozon ; WA : wave_ci/orange_money_ci=Orange Max it/mtn_momo_ci ; INT : wise/revolut/payoneer) + Tap Tap Send. Détail dans `docs/APK_INTELLIGENCE.md`. → **Pinning généralisé en un seul cycle** (plus de phasage 4a/4b ; 4b absorbé).
- **mtn_momo_ci** : packages **alternates** `com.consumerug` ET `mtnft.momo.consumer` (capture Android + registre launcher) — le réel installé sur les téléphones CI peut être l'un ou l'autre selon version.
- **Tap Tap Send** : **launcher payeur WA** (app d'envoi qui renforce les corridors WA), PAS un profil receveur/parser. Entrée dans le registre payeur WA (deeplinks `taptapsend`/`taptapsendmoney`, cert `e10a90f4…`). Aucun parser de notif (sender-side).
- **Orange Max it** = `com.orange.myorange.oci` = le package `orange_money_ci` existant (cert `b67affc…`).

## 9. Déploiement

Migrations 030/031 avant push (031 ajoute une colonne lue sur le chemin signal + une table). APK republié. WA/RU (4b) déployé séparément avec sa migration 032.
