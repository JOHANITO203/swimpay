# Checkout Bank Logo Fix Report

Date: 2026-05-13

## Result

Les logos checkout des banques enregistrees ne dependent plus du repertoire courant du process Node.

## Root Cause

`BankLogoAssets.ts` lisait les PNG Android via `join(process.cwd(), asset.path)`. En staging, si `swimpay-web` demarre depuis un autre cwd que la racine repo, les cinq PNG de banques retombaient silencieusement sur des initiales. Ozon gardait un placeholder CSS bleu, ce qui donnait l'impression que seul Ozon avait un logo.

## Changes

- `BankLogoAssets.ts` calcule maintenant la racine repo depuis `import.meta.url`.
- Le checkout continue de reutiliser les assets enregistres dans `design/ASSET_REGISTRY.md`.
- Aucun nouveau logo non documente n'a ete ajoute.
- Ozon reste le placeholder documente `OZ` jusqu'a asset officiel.

## Tests

- Web checkout test force `process.cwd()` vers un chemin invalide et verifie que les CSS de logos contiennent encore des `data:image`.
- `npm run checkout:screenshot:record` a ete lance car Step 2 affiche maintenant sender/receiver bank separement.
- `npm run checkout:screenshot:verify` passe sur 5 baselines apres enregistrement intentionnel.
