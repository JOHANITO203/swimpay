# Passation — 2026-06-03 · Durcissement receiver + Afrique de l'Ouest

> Document de passation : ce qui a été livré aujourd'hui (tout sur `main`, poussé) et ce qu'il reste à faire. Source de vérité pour reprendre le travail.

## TL;DR
- **Receiver Android durci** contre les OEM killers / Doze / reboot + alerte marchand hors-ligne. → `main`.
- **Afrique de l'Ouest (UEMOA / XOF) activée côté payeur** : routing des banques/wallets par devise, schemes deeplink extraits des vrais manifests, 9 logos, régime franc CFA (sans décimales). → `main`.
- **Moteur de matching** : compatibilité nom expéditeur (capacité). → `main`.
- **APK staging buildé & vérifié** (OEM dedans), installable. **APK release signé : bloqué par la RAM locale**, pas par le code.
- **CI vert** (corrigé en fin de session).

## Livré aujourd'hui (sur `main`, poussé)

| Domaine | Détail | Commits |
|---|---|---|
| **Build android** | Heap Gradle 3g / workers 2 (fix OOM compile) | `e3c1ccb` |
| **Receiver OEM** | Foreground service `specialUse`, auto-reconnect listener (`requestRebind`), re-arm au boot/update, heartbeat garde-fou + **alerte marchand hors-ligne**, outbox expedited + wakelock, exemption batterie + autostart OEM, diagnostic `ApplicationExitInfo` | `1707d6c`→`d1416c9`, merge `ad1e360` |
| **Matching nom expéditeur** | `evaluateSenderNameCompatibility` + score + vecteur de confiance (capacité moteur) | `c65f72d` |
| **Afrique de l'Ouest — données** | Recherche + extraction des manifests (schemes `wave://`, `omk://`, `sameaosnapp://`, …) ; script réutilisable `scripts/apk-deeplink-harvest.sh` | `9b6ca8f` |
| **Afrique de l'Ouest — contrat** | `WestAfricaPayerBankLauncherRegistry` (11 lanceurs), type `PayerBankCountry`, `launch_strategy: ussd_dial`, `ussd_transfer_template` | `d576b18` |
| **Afrique de l'Ouest — activation** | `payerLaunchersForCurrency()` (XOF→WA, sinon RU), câblé au checkout ; régime **franc CFA** (`formatAmountMinor` sans décimales) | `2261b00` |
| **Logos + doc** | 9 logos payeur (placeholders propres) + doc sur l'élément retardé | `bd3d145` |
| **CI** | Fix garde-fou (commentaire) + test metaspace | `cd01922` |

## État de vérification
- **TS/JS** : `npm test` (vitest) **vert — 88 fichiers / 762 tests** (lancer en séquentiel `--no-file-parallelism` sur machine peu RAM). Typecheck monorepo OK.
- **Android (JVM)** : `:app:testDebugUnitTest` **vert — 270 tests** (durcissement OEM inclus).
- **APK staging** : buildé et vérifié (manifest contient FGS specialUse, boot receiver, perms OEM) → `apps/android-receiver/android/app/build/outputs/apk/staging/app-staging.apk`.
- **OEM réel** : **non validé sur device** (pas de Xiaomi ici) → suivre `docs/RECEIVER_OEM_TEST_PLAN.md`.

## Reste à faire (priorisé)

### 🥇 Bloquants pour une release
1. **APK release signé** : build R8 crashe en **OOM mémoire native** (machine 8 Go, ~2 Go libres ; commit virtuel ~1,8 Go). Keystore + secrets OK (`~/.gradle/gradle.properties`, alias `swimpay-release`). → libérer la RAM (fermer apps) **ou** agrandir le pagefile **ou** builder en CI/machine plus grosse, puis `npm run android:assemble:release`.
2. **Validation OEM on-device** (Xiaomi/Redmi réel) : exécuter `docs/RECEIVER_OEM_TEST_PLAN.md` (capture 30 min background, `am kill`→reconnect, Doze, reboot, alerte hors-ligne).

### 🥈 Afrique de l'Ouest — pour un flux réellement bout-en-bout
3. **Capture côté receiver** : l'app marchand ne sait pas encore **détecter** les notifs Orange Money/Wave/MTN sur le téléphone (allowlist `BankTargetLock` + parsing = RU only). À étendre + valider sur device WA. **C'est ce qui manque pour que l'APK serve un marchand ouest-africain.**
4. **Validation device des deeplinks WA** : 9 packages absents d'apkpure (MTN, Free/Mixx, Moov CI, UBA, NSIA, …) → `adb pull` + `scripts/apk-deeplink-harvest.sh` ; confirmer que les schemes extraits *ouvrent* l'app + le chemin de prefill montant. Voir `docs/WEST_AFRICA_PAYER_LAUNCHERS.md`.
5. **Onboarding marchand WA** : profils de banque réceptrice + moyens de réception WA (aujourd'hui RU only) pour qu'une session XOF puisse exister.
6. **Lanceur `ussd_dial`** : implémenter l'ouverture `tel:` (avec `%23` pour `#`) côté SDK/checkout pour les entrées `ussd_dial` (template prêt dans le registre).
7. **Logos officiels** : remplacer les placeholders monogrammes par les vrais (sources listées dans `apps/web/assets/payer-logos/README.md`).

### 🥉 Plus tard (décisions produit)
8. **Nom expéditeur bout-en-bout (VA1b)** : reporté volontairement — voir `docs/DELAYED_SENDER_NAME_MATCHING.md` (décision privacy + clé partagée + auto-confirmation requise).
9. **Auto-confirmation (VA4)** : levier UX « comme un PSP », gated par policy/ADR — à concevoir séparément.
10. **Capacité amount-lease à l'échelle** : dimensionner les slots de réconciliation pour ~100 paiements concurrents même prix (offset au-delà des kopecks/centimes).

## Docs détaillées
- `docs/FULFILLMENT_RELIABILITY.md` — diagnostic + 8 tâches OEM (spec d'origine).
- `docs/RECEIVER_OEM_TEST_PLAN.md` — plan de validation OEM on-device.
- `docs/WEST_AFRICA_PAYER_LAUNCHERS.md` — packages, USSD, schemes extraits, gaps + recette `adb pull`.
- `docs/DELAYED_SENDER_NAME_MATCHING.md` — pourquoi le nom expéditeur est reporté + impact business.
- `apps/web/assets/payer-logos/README.md` — logos placeholders + sources officielles.

## Reprendre vite
```
# APK release signé (après avoir libéré de la RAM) :
npm run android:assemble:release        # → apps/android-receiver/android/app/build/outputs/apk/release/app-release.apk
# APK de test maintenant :
#   apps/android-receiver/android/app/build/outputs/apk/staging/app-staging.apk
# Suite de tests (machine peu RAM) :
npx vitest run --no-file-parallelism
# Compléter les deeplinks WA manquants (device branché) :
adb shell pm path <pkg> ; adb pull <chemin> base.apk ; bash scripts/apk-deeplink-harvest.sh <pkg>
```
