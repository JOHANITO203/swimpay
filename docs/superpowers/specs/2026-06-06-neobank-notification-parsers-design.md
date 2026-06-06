# Design — Parsers de notifications néobanques (Wise / Revolut / Payoneer)

> **SUPERSÉDÉ (2026-06-06)** par `2026-06-06-apk-intelligence-channel-detection-design.md` :
> la détection bascule sur channel-ID + cert d'abord (le texte devient appoint), le
> harvest s'étend aux 3 familles, et le sous-projet est phasé 4a/4b. Le parser texte EN
> et les profils INT décrits ici restent valides comme couche « appoint » du nouveau design.

**Date :** 2026-06-06
**Statut :** Validé (best-effort + learning ; 3 apps ; anglais v1 ; detection_supported true dès ce cycle). Harvest réel effectué — voir `docs/NEOBANK_NOTIFICATION_TEMPLATES.md`.
**Périmètre :** `packages/bank-templates`, Android `BankTargetLock`, migration 030 (certs harvestés), `packages/contracts` (detection_supported), republication APK, docs. **Hors scope :** auto-confirm néobanque (jamais), FR/RU (via learning), parsing email/in-app.

## 1. Problème & stratégie

Les profils `wise_int`/`revolut_int`/`payoneer_int` existent (rail wallet_transfer, USD) mais `detection_supported: false` : aucune notification n'est parsée, tout est review manuel sans assistance. Le harvest APK (2026-06-06) a fourni :
- **Wise** cert `149c4ea5…`, template `%1$s received` ;
- **Revolut** cert `9c9be07135…`, copie composée serveur (fragments `from %1$s`) ;
- **Payoneer** : absent d'apkpure, aucun cert.

Stratégie : parsers **best-effort anglais** fondés sur ces données + formulations connues, profils en statut **learning** (le loop TEMPLATE_OBSERVED affine ce que l'APK ne révèle pas), **jamais d'auto-confirm** (le rail reste `review_required_beta`). Les signaux **assistent** la review — exactement comme le rail RU aujourd'hui.

## 2. bank-templates

### 2.1 Profils
`BankProfile.country` élargi `'RU' | 'INT'`. 3 profils néobanques ajoutés (`createInternationalLearningProfile`) : statut `learning`, autoConfirm `disabled`, `supportedLocales: ['en']`, `trustedApps` pré-remplis avec les certs harvestés (Wise/Revolut) ou `documented_unknown` (Payoneer), `verificationStatus: 'pending_verification'`.

### 2.2 Chemin de parsing INT (anglais)
`parseBankNotification` reçoit déjà `bankProfileId` ; on lui passe le `country`/locale du profil (ou on dérive INT du préfixe `*_int`). Quand INT :
- **Normalisation locale-neutre** : `normalizeIntlText` = NFKC + collapse espaces + `toLowerCase()` (pas `ru-RU`).
- **Montant** : `extractUsdAmountMinor` — `$1,234.56` / `1234.56 USD` / `US$ 50.00` (séparateurs US, 2 décimales), réutilise la garde anti-dollar-préfixé existante.
- **Direction** : matcher anglais argent-reçu — `received`, `you received`, `%s received`, `got paid`, `payment from`, `sent you`, `from <name>` ; exclut les sortants (`you sent`, `you paid`, `payment sent`) et le bruit (`incoming call`, `add money`, `confirm your email`…). Les faux positifs marketing tombent en `unknown` (gate de direction existant → pas de review créée).
- **Référence/expéditeur** : note de transfert / nom expéditeur si présents (best-effort).
- `signalQuality` : USD compte comme devise valide (déjà neutralisé au sous-projet 3). `allowAutoConfirmCandidate` : **inchangé** (RUB strict → toujours `false` pour INT).

Le chemin RU reste **byte-identique** (aucune régression).

## 3. Android receiver

- `BankTargetLock.supportedTargets` += 3 cibles : `com.transferwise.android→wise_int`, `com.revolut.revolut→revolut_int`, `com.payoneer.android→payoneer_int`. `bankProfileIdForPackage` les mappe ; capture/extraction/upload **inchangés** (cert réel du device → `TO_VERIFY` → backend).
- Aucun changement au flux de signature : le backend reçoit `package_name` + `package_cert_sha256` du device, crée `bank_app_signatures` en `pending_verification`, revue opérateur (mécanique existante). Le cert harvesté en base (030) sert de **cert attendu** à confronter au premier signal réel — il n'auto-trust rien (mirror ≠ Play).

## 4. Migration 030

`UPDATE bank_profiles SET package_cert_sha256 = '149c4ea5…' WHERE id='wise_int'` ; `'9c9be07135…'` pour `revolut_int` ; `payoneer_int` inchangé (`documented_unknown`). Idempotent. Aucune colonne ajoutée.

## 5. Activation

`packages/contracts` : `detection_supported: true` pour les 3 profils (le builder `receiverBank` repasse au défaut `true`). Statut `review_required_beta` **inchangé** : la bascule signifie « on parse et on assiste la review », pas « auto-confirm ». Effet concret : un signal Wise capté sur le device du marchand est désormais parsé, matché à la session USD, et présenté dans la review queue (au lieu d'être ignoré).

## 6. Tests

- bank-templates : golden cases EN par app (`You received $50.00 from John` → incoming/USD/5000 ; fragments Revolut ; sortants → unknown ; marketing `Add money instantly` → unknown ; `incoming call` → unknown). Non-régression RU complète. `extractUsdAmountMinor` (séparateurs, US$, garde CA$).
- Android : `BankTargetLock` mappe les 3 packages ; un test de non-régression confirme que les packages inconnus restent `unknown`.
- contracts : les 3 profils ont `detection_supported: true`, statut/rail/USD inchangés.
- Migration 030 : certs présents après application (vérif manuelle au déploiement).

## 7. Risques

| Risque | Mitigation |
|---|---|
| Copie de notif composée serveur (Revolut/Payoneer) non couverte par l'APK | Mode learning + matcher anglais générique ; confiance initiale plus basse assumée |
| Cert apkpure ≠ cert Play | Seeding = cert attendu seulement ; `bank_app_signatures` pending→operator inchangé ; jamais d'auto-trust mirror |
| Faux positif marketing (`$` dans une promo) | Gate de direction (anglais argent-reçu strict, sortants/bruit exclus) → `unknown` → pas de review |
| Notifications non-anglaises (device FR/RU) | v1 anglais documenté ; learning capte les autres langues |
| Payoneer sans evidence APK | learning-only, cert `documented_unknown`, confiance la plus basse — honnête |

## 8. Déploiement

Migration 030 avant push (cosmétique : remplace `documented_unknown`, pas bloquant si tardif). Rebuild + republication APK release (mêmes étapes que les cycles 1-2, certificat de signature SwimPay inchangé). Aucun impact sur les marchands non-USD.
