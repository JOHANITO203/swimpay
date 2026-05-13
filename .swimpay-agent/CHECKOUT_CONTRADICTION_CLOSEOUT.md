# Checkout Contradiction Closeout (Audit-Only)

Date: 2026-05-13

## Contradictions trouvées

1. UI sender banks branchée sur `payer_bank_launchers` et pas strictement sur `available_sender_banks`.  
2. Mapping logos encore partiellement local (risque de dérive contrat/assets).  
3. Step resolver frontend dépend plus de champs session que de `checkout_state` canonique.  
4. Fallback retour final basé sur `history.back()` quand aucune URL sûre n’existe (safe mais non déterministe).

## Contradictions critiques

- **Critique 1 (contrat)**: source de vérité sender bank non unique côté UI.  
- **Critique 2 (UX nav)**: fallback retour non déterministe sur certains environnements mobile in-app browser.

## Contradictions déjà corrigées (vérifiées)

- Late buyer claim (`already_confirmed/rejected/expired`) sans 5xx.  
- Priorité états finaux sur query params (`checkout_edit`).  
- Status endpoint buyer avec `no-store/no-cache`.  
- Filtre sécurité pour empêcher destination brute API JSON.

## Tests manquants

- E2E webhook fulfillment consumer-side (signature/fulfillment réel).  
- Multi-tab / stale session reopen matrix complète.  
- Cas de fallback return sans historique browser utile (webview isolée).

## Corrections recommandées (prochain sprint)

1. Utiliser `available_sender_banks` comme source UI primaire, `payer_bank_launchers` en méta launcher seulement.  
2. Prioriser `logo_asset_key` backend sur mapping local.  
3. Faire converger renderer d’étape sur `checkout_state` canonique backend.  
4. Introduire fallback return déterministe (`/merchant/return-unavailable`) au lieu de `history.back()` pur.

## Risques staging

- Risque visuel/contrat (logos/manque sélection) encore possible si payload backend évolue.
- Risque de retour buyer inattendu en webview quand aucun return target valide n’est fourni.

