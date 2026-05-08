# Receiving Methods Checkout Integration Report

Date: 2026-05-08

## Existing Checkout Contract

Checkout already consumes merchant receiving destinations through the internal receiving-route model.

Current flow:

1. Buyer selects receiver bank.
2. Backend returns active receiving methods/routes for that bank only.
3. Buyer selects the merchant receiving method.
4. Payment session stores `selected_receiving_route_id`.
5. Copy/instruction details are available only after a receiving method is selected.
6. Payer launcher and instructions remain blocked until the route/method is selected.

## Active Only

Inactive receiving methods are not returned by checkout-bank route listing and cannot be selected through the visible checkout path.

## Payment Intent Context

The selected receiving method contributes:

- expected bank;
- method rail;
- masked destination;
- selected receiving route id;
- HMAC/last4 retained server-side for dedupe/matching context.

## No Confirmation Change

Receiving methods do not confirm payments.

Android capture still only uploads redacted signed signals. Backend matching still creates manual review only. `payment.confirmed` remains emitted only after merchant manual confirmation.
