# SwimPay Receiver — Plan de validation OEM on-device

> À exécuter **sur device réel** par le propriétaire (le build CI ne peut pas valider la survie OEM).
> Branche : `feat/receiver-oem-hardening`. Implémente `docs/FULFILLMENT_RELIABILITY.md` (tâches 1–8).
> Cible prioritaire : **Xiaomi/Redmi (MIUI/HyperOS)**, puis Samsung (OneUI), Oppo/Vivo (ColorOS/Funtouch).

## 0. Build & install

```powershell
# Debug (backend staging) :
npm run android:assemble:debug-vps
adb install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk
# Filtrer les logs utiles :
adb logcat -s SwimPayReceiverListener SwimPayReceiverFgs SwimPaySignalWorker SwimPayReceiverBoot SwimPayReceiverExit
```

## 1. Onboarding & permissions (tâches 1 & 4)
1. Ouvrir l'app → accorder l'accès aux notifications (NotificationListener).
2. Au 1er lancement, le système **doit** proposer l'exemption batterie (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`). Accepter.
   - Vérif : `adb shell dumpsys deviceidle whitelist | findstr com.swimpay.receiver` → présent.
3. **MIUI/ColorOS** : ouvrir l'écran *Autostart / Démarrage auto* et autoriser SwimPay (l'app peut y mener via `OemAutostartGuide`).
   - C'est le **vrai bloqueur** MIUI au-delà de l'exemption batterie standard.
4. Vérif FGS actif : la notification discrète « SwimPay actif » est présente, et
   `adb shell dumpsys activity services com.swimpay.receiver | findstr ReceiverForegroundService` montre le service `isForeground=true`.

**Critère** : accès notif + exemption batterie + autostart accordés ; notification « SwimPay actif » visible.

## 2. Capture en arrière-plan 30 min + écran éteint (tâche 1)
1. Envoyer un paiement test (ou notif bancaire test d'une banque surveillée).
2. Mettre l'app en arrière-plan, écran éteint, attendre **30+ min** (laisser le device dormir).
3. Recevoir une **2ᵉ** notif bancaire test.

**Critère** : la 2ᵉ notif est captée (`onNotificationPosted` dans logcat) → signal uploadé → ordre passe « à vérifier ».

## 3. Kill simulé → auto-reconnect (tâche 2)
```powershell
adb shell am kill com.swimpay.receiver            # tuer le process en arrière-plan
# (optionnel MIUI) forcer un unbind listener via Doze :
adb shell dumpsys deviceidle force-idle
```
Puis recevoir une notif bancaire test **sans rouvrir l'app**.

**Critère** : le listener se re-lie tout seul (`requestRebind` → `onListenerConnected` dans logcat ; ligne `self_heal ... rebind=true` côté FGS), notif suivante captée. Aucune ouverture manuelle.

## 4. Doze (tâche 6 — flush expedited + wakelock)
```powershell
adb shell dumpsys deviceidle force-idle           # forcer le Doze profond
# recevoir une notif test, puis :
adb shell dumpsys deviceidle step
adb shell dumpsys deviceidle unforce
```
**Critère** : les signaux en attente sont uploadés **< 1 min** après sortie du Doze / retour réseau (log `SwimPaySignalWorker ... success=true`), app backgroundée.

## 5. Reboot (tâche 3)
```powershell
adb reboot
# après redémarrage complet, NE PAS ouvrir l'app, attendre ~1 min puis :
adb logcat -s SwimPayReceiverBoot SwimPayReceiverListener
```
Recevoir une notif bancaire test sans ouvrir l'app.

**Critère** : log `SwimPayReceiverBoot re-arming capture after action=android.intent.action.BOOT_COMPLETED`, le listener est re-lié (rebind), notif captée. ⚠️ Sur Android 12+ le FGS « nu » est refusé au boot — c'est attendu (rebind + WorkManager prennent le relais ; pas de crash `ForegroundServiceStartNotAllowedException`).

## 6. Mise à jour de l'app (tâche 3)
```powershell
adb install -r app-debug.apk     # réinstall = MY_PACKAGE_REPLACED
```
**Critère** : log `... action=android.intent.action.MY_PACKAGE_REPLACED`, capture ré-armée sans ouvrir l'app.

## 7. Alerte marchand hors-ligne (tâche 5)
1. App ouverte/onboardée, puis **révoquer l'accès notifications** dans les réglages système (ou couper l'autostart et laisser l'OEM tuer le listener > 5 min).
2. Attendre.

**Critère** : une notification locale **« SwimPay ne reçoit plus »** apparaît (< 5 min via la boucle FGS ; au pire au prochain heartbeat 15 min si le FGS a été tué). Le dashboard backend reflète `listener_connected=false` / `notification_access_enabled=false` au heartbeat suivant. Réaccorder l'accès → l'alerte disparaît (`clear()` sur état sain).

## 8. Diagnostic de mort (tâche 7)
Après n'importe quel kill/crash, rouvrir l'app et lire :
```powershell
adb logcat -s SwimPayReceiverExit
# ex : last_exit reason=low_memory code=3 ... model=Redmi Note ... abi=arm64-v8a
```
**Critère** : la raison du dernier exit (OEM kill / OOM / crash) est loggée avec modèle + ABI.

## 9. Build OOM (tâche 8)
**Critère** : `npm run android:compile` et `npm run android:test` se terminent **sans** générer de `hs_err_pid*.log` / `replay_pid*.log` à la racine (heap Gradle 3g).

## Bout-en-bout (Definition of Done)
Sur device whitelisté : un paiement reçu, app backgroundée **30+ min / Doze / après reboot**, est **capté + uploadé + matché + webhook livré** sans intervention manuelle ; et le marchand est **alerté** dès que le receiver passe hors-ligne.

## Limite connue (à valider/affiner on-device)
Si l'OEM tue le process **brutalement sans** déclencher `onListenerDisconnected()`, l'état persisté `connected` peut rester périmé jusqu'au prochain `onListenerConnected`/heartbeat. Filets en place : `START_STICKY` (relance du FGS), rebind au boot, et rebind/alerte au heartbeat (15 min). Observer le délai réel de détection sur MIUI et ajuster la cadence du heartbeat si besoin.
