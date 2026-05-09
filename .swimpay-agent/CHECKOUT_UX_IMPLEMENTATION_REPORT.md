# Checkout UX Implementation Report

Date: 2026-05-09

## Files Changed

- `apps/web/src/screens/CheckoutScreen.ts`
- `apps/web/src/index.ts`
- `apps/web/src/checkout.test.ts`
- `apps/web/src/copy-guardrails.test.ts`

## Implementation

The hosted checkout now renders as a progressive buyer flow:
- intro-first when no Expected Payment Profile exists;
- buyer information panel with progressive card/phone input;
- method-compatible route selection;
- payment instructions card with copy actions;
- countdown timer;
- bank-open action;
- buyer paid claim action;
- buyer-safe waiting timeline.

## Backend Interaction

Existing contracts are preserved:
- Step 1 still creates the Expected Payment Profile.
- Step 2 still selects a compatible receiving route.
- `continue-to-bank` still arms the receiver only.
- `claimed-paid` remains a buyer claim only.

Small web routing improvement:
- form-url-encoded checkout POSTs redirect back to `/checkout/:id` instead of returning raw JSON to the browser.
- JSON callers still receive JSON.

## Safety

Preserved:
- no raw PAN/phone in HTML after submit;
- explicit destination copy endpoint only;
- no CVV/expiry/SMS/PIN UI;
- no payment confirmation from buyer actions;
- no public webhook changes.
