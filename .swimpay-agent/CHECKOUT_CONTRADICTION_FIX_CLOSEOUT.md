# Checkout Contradiction Fix Closeout

Date: 2026-05-13

## Contradictions corrigées

1. Source UI sender banks: `available_sender_banks` prioritaire.
2. Contrat logo: `logo_asset_key` backend prioritaire, mapping local en fallback.
3. Renderer d’étapes: `checkout_state` canonique prioritaire.
4. Fallback retour: URL stable dédiée au lieu de `history.back()` seul.
5. Nettoyage copy: suppression des libellés “Runtime verified”.

## Tests ajoutés/ajustés

- Sender banks rendus depuis `available_sender_banks`.
- Priorité de `logo_asset_key` backend.
- Priorité état canonique `checkout_state`.
- Fallback retour déterministe.
- Assertions mises à jour pour ne plus attendre `history.back()`.

## Validation

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm test` ✅ (708 tests)
- `npm run build` ✅
- `docker compose ... config` ✅
- `npm run checkout:screenshot:verify` ✅

## Risques restants

- Si backend n’envoie pas `available_sender_banks`, UI retombe en fallback launchers (comportement prévu mais moins strict).
- Le fallback `/merchant/return-unavailable` nécessite que les intégrateurs configurent un vrai return target pour UX optimale.

