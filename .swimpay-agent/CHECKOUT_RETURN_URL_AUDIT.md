# Checkout Return URL Audit

generated_at: 2026-05-13T00:59:00+03:00

## Scope

Audit du retour acheteur après checkout confirmé, séparé du fulfillment marchand externe.

## Findings

| Surface | Result | Notes |
| --- | --- | --- |
| SDK/API order creation | partial | Le SDK Node envoyait déjà `return_url`, mais l'API ne le validait ni ne le persistait. |
| DB order record | missing | `orders` ne stockait pas de `return_url`. |
| Payment session/status contract | missing | Le status checkout confirmé n'exposait pas de retour marchand stocké. |
| Hosted checkout button | partial | Le bouton pouvait utiliser un retour natif synthétique Android, sinon `history.back()`, mais pas le `return_url` SDK/API. |
| Fallback absent | aligned | En absence d'URL sûre, le checkout garde un fallback historique navigateur et n'invente aucune URL. |
| Fulfillment | aligned conceptually | Le bouton retour est UX only; il ne déclenche pas la livraison produit. |

## Root Cause

Le contrat `return_url` existait côté client SDK/API mais s'arrêtait à la frontière d'entrée API. Le backend ne le persistait pas dans `orders`, donc le checkout confirmé ne pouvait pas le récupérer.

## Security Result

- `https` est accepté.
- Les custom schemes/app links sont acceptés uniquement s'ils sont fournis explicitement par le marchand.
- `http`, `javascript`, `data`, `file`, `content`, `intent` et `android-app` sont rejetés.
- Les paramètres de query ressemblant à des secrets/tokens/API keys sont rejetés.
- L'URL de retour reste une navigation UX et ne vaut jamais preuve de paiement.
