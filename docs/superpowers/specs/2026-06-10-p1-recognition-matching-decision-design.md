# Spec — P1 : Précision de reconnaissance + matching par moyen de réception + décision finale

**Date :** 2026-06-10
**Statut :** validé (design)
**Type :** colonne (fiabilité) — sous-projet « P1 » du programme robustesse receiver

## Problème

`matching-core` a un `MatchConfidenceVector` riche et une détection de collision, **mais** :
- le `rail` ne connaît que `sbp | card | unknown` → fidélité **RU-centrée** ; WA (mobile money) et USD (wallet) tombent en `unknown`, score plafonné sur les marchés primaires ;
- le **channel-ID appris** (`bank_notification_channels`, migration 031) est **capturé mais pas couplé** au vecteur de confiance (le cert l'est via `bank_package`) ;
- la **décision finale n'est pas implémentée** : `MATCHING_CORE_FOUNDATION.finalDecisionImplemented:false`, `PaymentIntentGateDecision.autoConfirmAllowed` codé en dur à `false`, et `evaluateSignalMatch` ne sort jamais `auto_confirm` (`needs_review | rejected | wait`).

Objectif P1 : reconnaître/matcher avec **précision maximale par moyen de réception** et implémenter une **décision finale** avec **auto-confirmation sous garde-fous**.

## Cadrage

**Dans le périmètre (étages 2, 3, 5 de l'audit) :**
- Modèles de matching **par moyen de réception** (extraction par rail → vecteur de confiance haute-fidélité).
- **Couplet de reconnaissance** `(package + cert + channel)` couplé au matching.
- **Décision finale** : issue `auto_confirm` + `autoConfirmAllowed` calculé.
- **Trigger** global par marchand + **plancher** d'auto-confirmation.

**Hors périmètre :**
- **P3** : ne-jamais-manquer / résilience listener + hors-ligne (étages 1 & 4 : listener rebind, foreground, sweep, heartbeat, outbox offline).
- **M** : identité d'hôte SDK.

## Décisions arbitrées (brainstorm)

1. **Trigger = global par marchand.** Réglage `auto_confirm_mode: 'auto' | 'manual'`, **défaut `manual`** (sûr). Une seule barre de confiance pour tous les rails.
2. **Plancher d'auto-confirmation** (même en mode auto) : (`reference=exact` **OU** identité forte `sender_phone=hmac_match`/`sender_card=hmac_match`) **ET** `amount=exact` **ET** `time_window=inside` **ET** **pas de collision** **ET** `bank_package=trusted_cert`. `amountOnly` reste interdit.
3. **Channel** : `channel=recognized` **obligatoire** pour l'auto-confirm **sur les rails qui exposent un channel appris/confirmé** ; **bonifiant mais non bloquant** là où le rail n'expose pas de channel stable (`not_applicable` — R8/obfuscation). Zéro fragilité sur ces rails.
4. **Collision → toujours `needs_review`**, quel que soit le mode.

## Architecture

### 1. Modèles par moyen de réception
- Étendre l'enum rail du vecteur : `sbp | card` → **`+ mobile_money` (WA) `+ wallet` (USD)** (+ `unknown`).
- `bank-templates/parser.ts` : extraction par format/rail des éléments de matching — WA : n° wallet/téléphone expéditeur ; USD : handle/nom expéditeur ; RU : sbp/card (existant). Renseigner `template: known_high | known_medium | unknown_shape` par méthode.
- Conséquence : `rail`, `sender_phone`, `sender_card`, `reference`, `template` cessent de tomber en `unknown` hors RU → score atteignable.

### 2. Couplet de reconnaissance `(package + cert + channel)`
- **Nouvelle dimension** `MatchConfidenceVector.channel: 'recognized' | 'pending_unknown' | 'not_applicable'`, alimentée depuis `bank_notification_channels` (statut confirmé du couple `(bank_profile_id, channel_id)`).
- `bank_package` (cert) reste la dimension signature existante.
- Le couplet `trusted_cert + channel=recognized` = **signal de reconnaissance fort** : booste le score et qualifie le plancher (règle channel ci-dessus).
- `not_applicable` quand le rail n'a aucun channel appris → ne pénalise pas.

### 3. Décision finale
- Ajouter **`auto_confirm`** aux issues (`evaluateSignalMatch` / gate).
- `autoConfirmAllowed` **calculé** (remplace le littéral `false`) ; `finalDecisionImplemented → true`.
- Sortie : `auto_confirm | needs_review | rejected | wait` + vecteur de confiance + reason codes.

### 4. Trigger + plancher (logique de décision)
```
si mode = manual            → needs_review (sauf rejected/wait)
si mode = auto :
   si collision             → needs_review
   sinon si plancher_atteint → auto_confirm
   sinon                    → needs_review
plancher_atteint =
   (reference=exact OU sender_phone=hmac_match OU sender_card=hmac_match)
   ET amount=exact ET time_window=inside ET bank_package=trusted_cert
   ET (channel=recognized SI le rail expose un channel ; sinon channel ignoré)
   ET pas de collision
```

### 5. Câblage & audit
- `apps/api/signals.ts` / `signal-worker` consomment la décision : `auto_confirm` → confirme l'ordre/session + émet l'événement ; sinon → crée la revue.
- `auto_confirm_mode` stocké sur le marchand (colonne + migration additive).
- Toute auto-confirmation **journalise** le `MatchConfidenceVector` + reason codes (piste d'audit immuable).

## Migrations / contrats
- `auto_confirm_mode` sur `merchants` (migration additive idempotente, défaut `manual`).
- Pas de nouvelle table (réutilise `bank_notification_channels`, `bank_profiles.package_cert_sha256`).
- Enum rail + dimension `channel` = niveau code (`matching-core`, `contracts`).
- Le câblage `channel_id → channel` réutilise la capture AI-T3 existante.

## Gestion d'erreur / sûreté
- Défaut **manual** ; collision **toujours** revue ; `amountOnly` jamais auto ; rail `unknown` → jamais auto.
- Channel manquant sur rail à-channel → pas d'auto (downgrade en revue), pas de blocage dur ailleurs.
- Idempotence : un ordre déjà confirmé → `rejected` (`order_already_confirmed`, existant).

## Tests
- **Parsing par rail** : WA mobile money + USD wallet → vecteur haute-fidélité (rail/phone/reference/template ≠ unknown).
- **Couplet** : `trusted_cert + channel=recognized` booste ; `not_applicable` ne pénalise pas ; channel manquant sur rail-à-channel bloque l'auto.
- **Matrice de décision** : mode × plancher × channel × collision → issue attendue.
- **Garde-fous** : collision → revue ; `amountOnly` → jamais auto ; chemin référence-exacte ; chemin identité-forte ; mode manual → toujours revue.
- **Audit** : auto-confirm journalise vecteur + reason codes.

## Interfaces / dépendances
- `packages/matching-core` (enum rail, dimension channel, décision finale, plancher), `packages/bank-templates` (parsing par rail), `packages/contracts` (rail/channel/auto_confirm_mode), `apps/api` + `apps/signal-worker` (consommation décision, exécution confirm/review), `packages/database` (migration `auto_confirm_mode`).
- **Ne touche pas** : listener/capture/outbox (P3), identité d'hôte (M).

## Relation au programme
- **P3** : ne-jamais-manquer + hors-ligne (étages 1/4) — sous-projet suivant.
- **M** : identité d'hôte SDK (polish) — spec déjà écrite, implémentation différée.
