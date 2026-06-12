# Spec — T6 Design : « Papier calme » porté en prod (standards juin 2026)

**Date :** 2026-06-12
**Statut :** validée (1 validation LO = cette spec) — sous-projet T6 de la spec cohérence `2026-06-12-product-coherence-receiving-first.md`
**Type :** passe design transverse, app Android (`apps/android-receiver`), zéro logique métier touchée

## Constat (audit 2026-06-12)

1. L'app Compose (26+ écrans, Material 3, FR/EN/RU, dark/light) porte l'ancien langage « premium glass » : fonds noirs à gradients navy/corail, glassmorphism (`LiquidGlassCard`), typo système Roboto, ~25-30 % de styles hors tokens (PremiumDashboardScreens.kt, PremiumComponents.kt), motion quasi absente.
2. Le prototype web 8 écrans (`design/prototype/swimpay-prototype.html`, commit 8ab8651) définit le langage cible : papier chaud `#F6F3EC`, encre `#17140F`, accents émeraude `#0E7B57` / corail `#F0532E` / or `#9A6712`, Fraunces (serif, montants, `tnum`) + Hanken Grotesk (UI), cartes blanches à hairline `#E7E1D5` et ombres douces, nav bottom translucide.
3. Tendances juin 2026 : interfaces calmes, fin des théâtralités visuelles ; serif + chiffres « ledger » = document de confiance ; motion qui explique (état, hiérarchie), respect de `reduced-motion` ; systèmes 100 % tokens.

## Décision (validée par LO)

Porter le langage du prototype dans l'app Compose (option « prototype web → port Compose » de D6). Pas de redesign from scratch. Dark = variante « encre chaude » dérivée (fond ~`#14110C`, surfaces chaudes, mêmes accents) — le prototype est light-only.

## Périmètre

**Dans :** `PremiumDesignTokens.kt` (palette light+dark, échelle d'opacité, gradients tokenisés), typo embarquée (Hanken Grotesk + Fraunces, OFL), `PremiumComponents.kt` (carte calme remplace le glass, boutons encre/ghost/corail, chips statut), passe sur tous les écrans (priorité : Accueil, Activité/Revue, Moyens de réception, Détail wallet, Onboarding, puis Réglages & secondaires), motion sobre (transitions, micro-interactions, cascade listes, respect reduced-motion), rapatriement des styles en dur dans les tokens.
**Hors :** landing web, apps/web, logique métier (T1–T5 intacts), module M, copy (honnête post-T3), cartes wallet à gradient de marque (conservées — seule couleur vive).

## Ordre d'exécution

1. **L1 — Tokens** : palette light « papier » + dark « encre chaude », opacité, gradients, rayons/espacements alignés prototype.
2. **L2 — Typo** : fonts embarquées (res/font), `PremiumType` complet (Fraunces montants + tnum, Hanken Grotesk UI).
3. **L3 — Composants** : carte calme, boutons, chips, nav ; purge du glass et des couleurs en dur des composants partagés.
4. **L4 — Écrans** : passe écran par écran (cœur puis secondaires) ; uniquement couche visuelle.
5. **L5 — Motion** : transitions d'écran, micro-interactions, cascades ; reduced-motion respecté.
6. **L6 — Vérif finale** : suite complète + baselines visuelles + screenshots light/dark émulateur.

## Vérification

- `npm run android:compile` + `npm run android:test` verts à chaque lot.
- Baselines Roborazzi ré-enregistrées en fin de chantier (`android:visual:accept`).
- Screenshots light/dark 390×844 comparés au prototype.
- Revue deux étages par lot (workflow LO AUDIT→PLAN→IMPLEMENT→REVIEW→…).

## Risque

Moyen : volume visuel important (PremiumDashboardScreens.kt ≈ 149 KB) mais zéro logique touchée ; tests T5 verrouillent la cohérence onboarding↔moyens↔allowlist↔dashboard.
