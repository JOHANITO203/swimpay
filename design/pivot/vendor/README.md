# Vendor — systèmes de composants UI (fintech)

Bibliothèques récentes **vendorisées** (zéro npm, sources dans le repo) pour
construire plusieurs versions des écrans (`design/pivot/*.html`). Tout est MIT.

| Fichier | Source | Usage |
|---|---|---|
| `shadcn-v4-tokens.css` | shadcn-ui/ui `apps/v4/app/globals.css` (2026-08) | Les tokens du système le plus utilisé : neutres oklch, `--radius .625rem` + échelle, ombres. Base de l'écran 3 v1. |
| `open-props.min.css` | open-props (unpkg, dernière) | Tokens universels : échelles d'espacement, rayons, ombres, easings, tailles de police. Idéal pour une version « rythme parfait ». |
| `daisyui-5.css` | daisyUI 5.7.22 (CSS complet) | Composants prêts en classes pures CSS (`btn`, `card`, `stat`, `table`, `tabs`, `navbar`…) + thèmes. Permet une version d'écran quasi sans CSS custom. |

Références de patterns (non copiées, à consulter) : **Origin UI**
(origin-space/originui — anatomie des contrôles), **Tremor** (blocs
metric/dashboard), **HyperUI / Preline** (snippets marketing+app), **Magic UI**
(effets). Apple HIG : voir la skill `.claude/skills/apple-hig/`.

Règle : dans un artifact (CSP), **inliner** le CSS nécessaire — pas de lien
CDN. Ces fichiers sont là pour être copiés/taillés, pas référencés à distance.
