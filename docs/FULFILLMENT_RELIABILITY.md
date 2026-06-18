# SwimPay — Fiabilité du receiver & du fulfillment (handoff exécutable)

> **But** : SwimPay permet à un marchand d'encaisser **sans PSP** (lecture des notifications bancaires sur un device receiver). La fiabilité dépend donc à 100% du fait que **l'app receiver Android survive en arrière-plan**. Aujourd'hui elle ne survit PAS aux « OEM killers » (MIUI/Redmi, OneUI, ColorOS…) → notifications bancaires ratées → paiement non détecté → **order « en cours » bloqué**.
> Ce doc = la checklist Option A (durcir le receiver) + filets côté merchant. Diagnostic établi le 2026-06-03 (inspection lecture seule). Mêmes patterns que le durcissement OEM réussi côté SWIMVPN (branche `feat/oem-hardening`).

## Cause racine (confirmée)
`SwimPayNotificationListenerService` capte via `NotificationListenerService`, mais `apps/android-receiver/.../AndroidManifest.xml` **n'a NI foreground service, NI BOOT_COMPLETED, NI auto-reconnect**. Quand l'OEM tue le process en arrière-plan : `onListenerDisconnected()` se déclenche mais rien ne ré-arme → la notif bancaire suivante est **perdue** → signal jamais capturé/uploadé → pas de paiement → order figé. (~40-60% des Android concernés.)

> Note : les `hs_err_pid*.log` à la racine = **OOM du build Gradle** (`-Xmx1024m`), pas du runtime paiement. Voir tâche 8.

## Tâches (priorisées) — pour la fenêtre Claude Code sur ce repo

### 🥇 1. Foreground service pour la capture
- Faire tourner la capture/upload dans un **foreground service persistant** (notif discrète « SwimPay actif »).
- Manifest : `android:foregroundServiceType="specialUse"` (+ `<property>` justificatif), permissions `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_SPECIAL_USE` (Android 14+), `POST_NOTIFICATIONS` (13+).
- Effet : Android ne tue plus le process en priorité ; le `NotificationListenerService` reste lié.
- Acceptation : app en arrière-plan 30+ min + écran éteint → une notif bancaire test est toujours captée.

### 🥇 2. Auto-reconnect du NotificationListener
- Dans `SwimPayNotificationListenerService.onListenerDisconnected()` → appeler `NotificationListenerService.requestRebind(ComponentName(...))`.
- Ajouter un check périodique (heartbeat, tâche 5) : si `NotificationAccessStatusReader` voit l'accès actif mais le listener non connecté → `requestRebind` + log.
- Acceptation : après un kill simulé (`adb shell am kill`), le listener se re-lie sans ouverture manuelle de l'app.

### 🥇 3. Redémarrage au boot
- `BroadcastReceiver` sur `BOOT_COMPLETED` **et** `MY_PACKAGE_REPLACED` (+ permission `RECEIVE_BOOT_COMPLETED`) → ré-arme la capture (démarre le FGS / `requestRebind`).
- ⚠️ Android 12+ : interdiction de démarrer un FGS « normal » depuis BOOT en arrière-plan → privilégier `requestRebind` du listener (autorisé) et/ou planifier via WorkManager expedited ; ne pas faire un `startForegroundService` nu depuis le boot (catch `ForegroundServiceStartNotAllowedException`).
- Acceptation : après reboot device, capture opérationnelle **sans** ouvrir l'app.

### 🥈 4. Exemption batterie + autostart OEM (onboarding)
- À l'install : demander `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` + **rafraîchir le statut au retour** (lifecycle resume — pas de statut périmé).
- Guider l'utilisateur vers l'**autostart MIUI/ColorOS** (intents OEM connus) — c'est souvent le vrai bloqueur, au-delà de l'exemption batterie standard.
- `BatteryOptimizationStatusReader` détecte déjà → le **remonter dans le heartbeat** + bloquer l'onboarding tant que non accordé.

### 🥈 5. Heartbeat = vrai garde-fou (pas juste de la télémétrie)
- `ReceiverHeartbeatWorker` (15 min) existe → ajouter : si **listener déconnecté / accès révoqué > 5 min** → (a) `requestRebind`, (b) **alerte marchand** (dashboard + notif locale « SwimPay ne reçoit plus, réactive l'accès »).
- Acceptation : le dashboard passe au rouge < 5 min après une coupure, avec action de remédiation.

### 🥈 6. Outbox : flush fiable
- `SignalUploadWorker` (WorkManager) : passer en **expedited** + flush de l'outbox **au reconnect du listener** (pas seulement sur nouvelle notif). Wake-lock court pendant l'upload.
- Acceptation : signaux en attente uploadés < 1 min après retour réseau/reconnexion, même app backgroundée.

### 🥉 7. Diagnostic crash (optionnel, comme côté VPN)
- Lire `ApplicationExitInfo` (API 30+) au lancement → si dernier exit = crash/kill → log (modèle device + ABI + tombstone) pour savoir *pourquoi* le receiver meurt. Pas de Firebase requis.

### 🥉 8. Build OOM (déblocage CI/dev)
- `gradle.properties` du module android : `org.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1g` (au lieu de 1024m) ; `org.gradle.workers.max=2`. Supprimer les `hs_err_pid*.log`/`replay_pid*.log` de la racine.

## Côté serveur (déjà OK, à vérifier)
La chaîne `review confirmée → NATS REVIEW_CONFIRMED → job-worker → webhook (7 retries, HMAC)` est solide (`apps/job-worker/src/webhooks.ts`). Vérifier juste : `WEBHOOK_WORKER_ENABLED=true`, le job-worker tourne, et le timeout de claim « delivering » (5 min) ne coince pas après un crash worker. (Option) **auto-confirm** des matches haute-confiance pour réduire la review manuelle.

## Matrice de test OEM (avant prod)
Sur Xiaomi/Redmi (MIUI), Samsung (OneUI), Oppo/Vivo : app backgroundée 30 min + Doze + reboot → la notif bancaire test est **captée + uploadée + matchée + webhook livré**. Vérifier exemption batterie + autostart accordés.

## Définition de « fini »
Un paiement reçu sur le device est **confirmé et propagé au marchand sans intervention manuelle** dans >90% des cas sur devices whitelistés, et le marchand est **alerté** dès que le receiver est hors-ligne.
</content>
