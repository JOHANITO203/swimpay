# Spec — Identité d'hôte SDK pour les opérations de vente

**Date :** 2026-06-10
**Statut :** validé (design)
**Type :** module (polish UI) — sous-projet « M » du programme fiabilité receiver

## Problème

Le widget **Activité** du receiver liste les **opérations de vente initiées via le SDK SwimPay**. Aujourd'hui la provenance s'exprime par un libellé générique (« canal reconnu / vérifié ») qui mélange deux choses et n'indique pas **de quelle surface de vente** vient l'opération. On veut afficher, par opération, le **nom + logo de l'app/site/bot hôte** où le SDK est intégré — pour un repère concret et distinctif.

## Cadrage

**Dans le périmètre (v1) :**
- Capturer l'identité de l'hôte du SDK (`{ host_type, host_id, name, logo }`) et l'attacher à l'opération de vente.
- L'afficher dans le widget **Activité** du receiver : « via {nom hôte} + logo », à côté (et non à la place) de la provenance bancaire.
- Résolveurs **Android natif** et **Web** implémentés ; résolveur **Telegram** défini en interface, implémenté au sous-projet « app Telegram ».

**Hors périmètre :**
- Override branding manuel par le marchand via dashboard (approche « registre configuré » — éventuel v2).
- La décision de confirmation auto/manuelle, le matching, la résilience hors-ligne → sous-projets **P1/P2/P3** séparés.
- Le widget **n'affiche jamais** d'éléments hors événements SDK (pas de détection brute) — donc chaque ligne possède par construction une identité d'hôte.

## Décisions arbitrées (issues du brainstorm)

1. **Pas de monogramme.** Logo **réel toujours**. Ordre de résolution du logo : icône native → favicon → photo bot → **plancher = marque SwimPay**. « via SwimPay » est une distinction valide (l'opération vient du SDK sur une surface SwimPay, ex. Mini App Telegram).
2. **Complète, ne remplace pas, la provenance bancaire.** Deux axes orthogonaux : provenance bancaire (cert/canal = sécurité) reste ; identité d'hôte = *origine de la vente* (contexte). Le widget montre les deux distinctement.
3. **Identité déclarée → non fiable.** Nom+logo sont déclarés par l'intégration. On sanitize l'image, on la marque « origine déclarée », jamais présentée comme garantie de sécurité.

## Architecture

### Résolveur d'identité d'hôte (par plateforme)
Sortie normalisée commune :

```
HostIdentity {
  host_type: 'android_native' | 'web' | 'telegram_miniapp' | 'swimpay'
  host_id:   string   // package / domaine / bot username
  name:      string
  logo:      LogoRef  // asset hash/url, ou plancher SwimPay
}
```

- **Android natif** (`packages/swimpay-android`) : `Context.packageManager` → `host_id`=package, `name`=`applicationInfo.loadLabel()`, logo=`loadIcon()` ré-encodé PNG ≤ 64×64.
- **Web** (SDK JS) : `host_id`=domaine, `name`=`document.title`→domaine en repli, logo=favicon (résolue/normalisée serveur).
- **Telegram Mini App** : `host_id`=bot, `name`+logo=profil du bot via Bot API (serveur). **Interface seulement en v1.**
- **Plancher** : si aucun logo exploitable → marque SwimPay (`host_type` inchangé, `logo`=swimpay).

### Transport (anti-gaspillage)
- À la création d'ordre (`packages/swimpay-node` + contrats) : on envoie `host_type`, `host_id`, `name` (léger, par opération).
- Le **logo** est uploadé **une seule fois par intégration** : dédup par hash, type/taille plafonnés, ré-encodage serveur (PNG ≤ 64×64). Jamais transmis à chaque vente.

### Stockage
Table légère `sdk_host_integrations` :

```
sdk_host_integrations (
  host_type        TEXT NOT NULL,
  host_id          TEXT NOT NULL,
  name             TEXT NOT NULL,
  logo_asset_ref   TEXT,            -- réf asset ré-encodé, NULL = plancher SwimPay
  logo_hash        TEXT,            -- dédup
  status           TEXT NOT NULL DEFAULT 'declared',  -- declared | verified | rejected
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (host_type, host_id)
)
```
Chaque ordre/opération référence `(host_type, host_id)`. Migration additive idempotente.

### Affichage
Widget **Activité** (receiver) — opérations SDK uniquement. Par ligne : pastille logo (squircle) + « via {name} » + chip « origine déclarée ». La provenance bancaire (vérifié/en revue) reste affichée séparément.

## Flux de données

```
Hôte (app/site/bot) ──SDK──> capture HostIdentity
   └─ name + host_id ─────────> création d'ordre (swimpay-node / contrats)
   └─ logo (1×/intégration) ──> upload → sanitize/ré-encode → asset + hash
Backend ── upsert sdk_host_integrations (dédup hash) ; ordre ↔ (host_type,host_id)
Receiver app ── lit l'opération + identité d'hôte ──> rendu widget Activité
```

## Gestion d'erreur / repli
- Pas d'icône native exploitable → favicon → photo bot → **plancher SwimPay** (jamais monogramme).
- Image invalide / trop grande / type non autorisé → rejet → plancher SwimPay.
- Hôte inconnu / champ manquant → `name`=host_id (domaine/package), logo=plancher.

## Sécurité / confiance
- Logo+nom **déclarés**, non fiables : ré-encodage (anti-payload), plafond de taille, types autorisés (png/jpg/svg-sanitizé), affichage « origine déclarée ».
- Strictement **distinct** de la provenance bancaire (cert/canal) qui, elle, est le signal de sécurité.
- Anti-usurpation : `status` permet à terme une vérification d'intégration (verified) ; v1 affiche toujours « déclaré ».

## Tests
- Résolveurs : Android (mock `PackageManager`), Web (mock `document.title`/favicon), Telegram (interface — stub). Plancher SwimPay quand pas de logo.
- Backend : upsert + dédup par hash, sanitize/ré-encode, rejet d'image invalide, idempotence migration.
- Contrats : validation `host_type/host_id/name` à la création d'ordre.
- UI : rendu d'une ligne avec logo tiers, avec plancher SwimPay, et avec « origine déclarée ».

## Interfaces / dépendances
- `packages/swimpay-android` (résolveur natif), SDK web (résolveur web), `packages/swimpay-node` + `packages/contracts` (champs à la création d'ordre), `packages/database` (table + migration), receiver app **Activité** (rendu).
- **Ne touche pas** : matching, décision de confirmation, provenance bancaire (sous-projets P1/P2/P3).

## Relation au programme
- **P1** Matching par moyen de réception + décision finale (`MATCHING_CORE_FOUNDATION.finalDecisionImplemented:false`).
- **P2** Trigger de confirmation auto/manuel (vit dans la décision finale de P1).
- **P3** Résilience hors-ligne + sécurité des deux parties.
- **M** (ce document) = polish UI, indépendant, n'altère aucune logique de paiement.
