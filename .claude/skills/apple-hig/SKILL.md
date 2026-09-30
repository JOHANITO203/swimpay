---
name: apple-hig
description: Use when designing or reviewing any user interface (web, mobile ou desktop) and Apple-grade polish is expected — spacing, touch targets, typography scale, corner radii, or the behavior of a specific component (button, tab bar, sheet, menu, alert, search field…) — or when the user asks for "comme Apple", HIG, or Human Interface Guidelines.
---

# Apple HIG — référence locale

## Overview

Extraction locale des **Human Interface Guidelines officielles d'Apple**
(developer.apple.com, endpoint DocC JSON, aspirée 2026-08-28) : 36 pages —
fondations + tous les composants — en texte intégral dans `references/`,
tableaux de valeurs inclus. Source primaire, pas de la lore.

## Comment s'en servir

1. **Question précise** → grep dans `references/` :
   `grep -riE "corner radius|44" .claude/skills/apple-hig/references/buttons.md`
2. **Composant à concevoir** → lire le fichier du composant (2-15 Ko chacun).
3. Les **tableaux chiffrés** (tailles typo par plateforme, dimensions) sont en
   fin de fichier, section « Tableaux ».

## Quick reference — valeurs vérifiées

| Règle | Valeur | Source |
|---|---|---|
| Zone tactile d'un bouton | **≥ 44×44 pt** (visionOS : 60×60) | buttons.md |
| Boutons côte à côte | ≤ 3 avec glyphes, ≤ 2 avec texte | layout.md |
| Bouton pleine largeur iOS | à éviter — respecter les marges système | layout.md |
| Action sheet | **≤ 4 boutons**, Annuler compris | action-sheets.md |
| Segmented control | ≤ 5 segments (iPhone), 5-7 (large) | segmented-controls.md |
| Sidebar | ≤ 2 niveaux de hiérarchie | sidebars.md |
| Espacement visionOS | centres des boutons ≥ 60 pt | buttons.md, layout.md |
| Échelles typo (Body, Title…) par plateforme | tableaux complets | typography.md |
| Contraste, tailles mini, Dynamic Type | | accessibility.md, typography.md |

## Index des composants

`buttons` `text-fields` `search-fields` `lists-and-tables` `collections`
`labels` `image-views` `tab-bars` `toolbars` (⚠️ les navigation bars ont
fusionné ici) `sidebars` `path-controls` `segmented-controls` `toggles`
`sliders` `steppers` `pickers` `menus` `alerts` `action-sheets` `sheets`
`popovers` `progress-indicators` `notifications` `widgets` `gauges`

Fondations : `layout` `typography` `color` `dark-mode` `materials` `motion`
`icons` `app-icons` `sf-symbols` `accessibility` `charting-data`

## Common mistakes

- **Tableaux typo : attention au mapping.** Les tableaux sont regroupés en fin
  de fichier (« Tableaux (extraits DocC) ») dans l'ordre des headings du corps
  (`## iOS, iPadOS Dynamic Type sizes` → `## xSmall` … `## Large (default)` …
  puis macOS, tvOS, watchOS). Le réglage par défaut iOS est le tableau
  « Large (default) » : **Body iOS = 17 pt** (ligne `| Body | Regular | 17 |
  22 |`, typography.md:267). Un `| Body | 14 |` appartient à une AUTRE taille
  ou plateforme.
- Citer « la marge Apple = 16 pt » sans plateforme : les valeurs varient —
  vérifier le tableau de la plateforme visée dans le fichier.
- Confondre rayon simple et **coins concentriques** (rayon intérieur = rayon
  extérieur − retrait) : chercher "concentric" / "corner" dans le composant.
- Appliquer les 60 pt d'espacement (visionOS, ciblage du regard) à iOS.
- Chercher `navigation-bars.md` : la page n'existe plus → `toolbars.md`.

## Refresh

Ré-aspirer (pages ou tableaux) : `node hig_fetch.mjs references/` puis
`node hig_tables.mjs references/` (scripts inclus dans ce dossier) — endpoint
`developer.apple.com/tutorials/data/design/human-interface-guidelines/<slug>.json`.
