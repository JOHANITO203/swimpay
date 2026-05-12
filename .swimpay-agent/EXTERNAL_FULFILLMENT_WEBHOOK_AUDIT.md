# External Fulfillment Webhook Audit

generated_at: 2026-05-13T00:59:00+03:00

## Scope

Audit du relâchement produit côté backend marchand externe via webhooks finaux SwimPay.

## Findings

| Surface | Result | Notes |
| --- | --- | --- |
| Final event timing | aligned | Les événements publics restent final-only après décision manuelle marchand. |
| Public event set | aligned | Seulement `payment.confirmed`, `payment.rejected`, `payment.expired`. |
| Webhook signing | aligned | Le worker utilise le secret webhook marchand et l'en-tête `SwimPay-Signature`. |
| Delivery history/retry | aligned | Livraison durable et retry via worker existant. |
| Payload external order mapping | partial | Le payload final ne portait pas assez de champs pour identifier proprement la commande externe. |
| Manual bank check fallback decisions | partial | Les décisions finales issues de `manual_bank_check` n'étaient pas relayées au webhook public. |

## Root Cause

Le worker webhook final était centré sur `confirmation_type=notification_signal` dans l'événement interne de review. Cela excluait les décisions finales manuelles issues du fallback no-notification, alors que le produit doit relâcher seulement après décision marchand, quel que soit le type de review.

## Preserved Product Truth

- Pas d'auto-confirmation.
- Pas de webhook avant décision finale marchand.
- `official_bank_confirmation=false`.
- Les événements publics gardent la disclosure V1 `confirmation_type=notification_signal`.
- Le type interne `manual_bank_check` reste utilisé pour l'audit/reason label, pas comme preuve bancaire officielle.
