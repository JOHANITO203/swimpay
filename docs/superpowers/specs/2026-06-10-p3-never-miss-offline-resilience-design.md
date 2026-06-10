# Spec — P3 : Ne jamais manquer + résilience hors-ligne

**Date :** 2026-06-10
**Statut :** validé (design)
**Type :** colonne (fiabilité) — sous-projet « P3 »

## Problème

La chaîne de capture est fragile : si le `NotificationListenerService` se déconnecte (OEM battery-killer, crash, révocation d'accès), des notifications de paiement réelles peuvent être **manquées** ; et hors-ligne, un signal capté doit être **durable, signé et non-rejouable** jusqu'à l'upload. Les briques existent (`SwimPayNotificationListenerService`, `ReceiverForegroundService`, `ActiveIntentNotificationSweep`, `ReceiverListenerLifecycleStore`, `ReceiverHeartbeat*`, `EncryptedOutboxStore`, `SignalUploadFlusher/Worker`, `ReceiverRetryPolicy`, `PayloadSigner`, compteur local monotone) — P3 les **complète et durcit** pour garantir : *on ne manque pas une vraie notif, et un signal capté n'est jamais perdu, dupliqué, ni falsifiable*.

## Cadrage

**Dans le périmètre (étages 1 & 4) :** résilience listener (reconnexion, foreground, balayage de rattrapage, heartbeat self-heal, détection de révocation) ; durabilité hors-ligne (outbox chiffré signé, ordre/anti-rejeu, store-and-forward, retry).
**Hors périmètre :** P1 (matching/décision), M (identité d'hôte).

## Décisions (objectif-driven)

1. **Reconnexion automatique** du listener à toute déconnexion (`requestRebind`) + relance via le foreground service.
2. **Balayage de rattrapage** (`ActiveIntentNotificationSweep`) au (re)démarrage + périodiquement : relit les notifications actives pour **récupérer celles postées pendant que le listener était down**. Dédup par `notification_hash` (existant) → zéro double traitement.
3. **Détection de trou** via le **compteur local monotone** (existant) : tout saut/rejeu est détecté côté backend (`local_counter_regression` existe) et côté device journalisé.
4. **Heartbeat self-heal** : si l'accès notifications est révoqué ou le listener inactif → alerte marchand + tentative de relance.
5. **Hors-ligne = durable + signé + ordonné** : signal chiffré au repos (outbox), **signé par la clé device** (`PayloadSigner`, non-répudiation côté marchand), `local_counter` monotone (ordre + anti-rejeu), store-and-forward avec retry/backoff (`ReceiverRetryPolicy`) → uploadé dès le retour réseau. **Rien n'est perdu** (sécurité acheteur : son paiement est enregistré même offline ; sécurité marchand : non falsifiable).

## Architecture

### Étage 1 — Ne jamais manquer
- **Rebind** : `onListenerDisconnected` → `requestRebind()` ; `ReceiverForegroundService` garde le process vivant ; `ReceiverListenerLifecycleStore` trace connected/disconnected + timestamps.
- **Sweep de rattrapage** : sur `onListenerConnected` + au boot + intervalle → `ActiveIntentNotificationSweep` relit `getActiveNotifications()`, passe chaque snapshot par le pipeline, dédup `notification_hash`. Récupère les notifs ratées pendant un down.
- **Heartbeat** : `ReceiverHeartbeatWorker` périodique → vérifie l'accès + l'activité du listener ; si révoqué/inactif → état d'alerte (UI) + relance ; envoie un battement au backend (détection device muet).

### Étage 4 — Hors-ligne durable
- **Outbox chiffré** (`AndroidEncryptedOutboxStore`) : tout signal capté y est persisté **avant** tout réseau ; chiffré au repos.
- **Signature + intégrité** : chaque enregistrement signé (`PayloadSigner`, clé Keystore) ; `payload_hash` d'intégrité ; `local_counter` monotone embarqué.
- **Store-and-forward** : `SignalUploadFlusher`/`SignalUploadWorker` + `ReceiverRetryPolicy` (backoff) ; rejoue la file dans l'ordre du compteur ; le filtre `isSafeUploadPayload` (existant) bloque tout payload non sûr.
- **Garanties** : pas de perte (persistance avant réseau), pas de rejeu (compteur monotone + dédup hash backend), non-répudiation (signature device + cert).

## Câblage & audit
- États listener/heartbeat exposés à l'UI (bandeau « réception active / interrompue »).
- Journal device : déconnexions, sweeps, items récupérés, gaps de compteur.

## Gestion d'erreur
- Accès notifications révoqué → état dégradé explicite + CTA re-autoriser (relie à l'onboarding permission).
- Échec d'upload → reste dans l'outbox, retry ; jamais de suppression avant ACK backend.
- Notif récupérée déjà traitée → dédup `notification_hash` → ignorée.

## Tests
- Sweep récupère une notif postée pendant un listener down ; dédup empêche le double.
- Rebind déclenché à la déconnexion.
- Heartbeat détecte la révocation → état d'alerte.
- Outbox : persistance avant réseau ; signature présente ; ordre par compteur ; retry après échec ; pas de suppression avant ACK ; `isSafeUploadPayload` bloque l'unsafe.
- Anti-rejeu : compteur régressif rejeté.

## Interfaces / dépendances
- `apps/android-receiver` (listener, foreground, sweep, lifecycle, heartbeat, outbox, flusher, retry, signer), `apps/api/signals.ts` (ACK, dédup hash, `local_counter_regression`).
- **Ne touche pas** : matching/décision (P1), identité d'hôte (M).

## Relation au programme
- **P1** : précision reconnaissance/matching/décision (specé).
- **M** : identité d'hôte SDK (specé, différé).
- **P3** (ce document) : garantit que P1 reçoit **toujours** un signal fiable, même après une coupure réseau ou listener.
