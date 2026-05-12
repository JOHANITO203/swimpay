# Checkout Return URL Fix Report

generated_at: 2026-05-13T00:59:00+03:00

## Implemented

1. Ajout de `orders.return_url` via migration additive `022_checkout_return_url_and_webhook_payload.sql`.
2. Validation API des champs d'entrée compatibles:
   - `return_url`
   - `success_url`
   - `merchant_return_url`
   - `app_link_url`
   - `android_deep_link`
3. Persistance de `return_url` lors de `POST /v1/orders`.
4. Exposition de `return_url` dans:
   - `GET /v1/orders/:id`
   - `GET /v1/payment-sessions/:id`
   - `GET /v1/checkout/:id/status`
5. Le hosted checkout confirmé utilise d'abord le `return_url` stocké.
6. Si aucun `return_url` n'existe, le checkout garde le fallback sûr existant.

## Contract

`return_url` est une URL de navigation acheteur uniquement.

It does not:
- confirmer le paiement;
- envoyer un webhook;
- relâcher le produit;
- transporter un secret.

## Tests Added

- SDK/API order creation stores safe `return_url`.
- Unsafe `return_url` values are rejected.
- Checkout status confirmed exposes stored `return_url`.
- Confirmed checkout button uses stored merchant return URL.
- Missing `return_url` keeps safe fallback.
