# Payment Compatibility Backend Refactor Report

Date: 2026-05-10

## Backend Changes

Updated:
- `apps/api/src/server.ts`
- `apps/api/src/orders.ts`
- `apps/api/src/payment-sessions.ts`
- `packages/contracts/src/index.ts`

## Route Selection

Expected Payment Profile creation now:
1. validates buyer payload first;
2. loads active checkout routes from backend source of truth;
3. filters routes by buyer method;
4. selects a compatible merchant receiving route;
5. persists:
   - `selected_receiving_route_id`;
   - `selected_receiver_bank_id`;
   - `selected_receiver_bank_profile_id`;
   - `selected_payer_bank_launcher_id`.

## Separation Fixed

Example now supported:
- merchant receives on Sberbank card route;
- buyer pays from T-Bank;
- `receiver_bank_id=sber_ru`;
- `sender_bank_id=tbank_ru`;
- `payer_bank_launcher_id=tbank_ru`.

## PAN Boundary

PAN validation now happens before route availability checks. Invalid card numbers return `400` instead of being masked by a route `409`.

## Matching Impact

Matching core was not rewritten. The important fix is that signal runtime now receives the existing matching fields correctly populated:
- selected route;
- receiver bank/profile;
- sender bank;
- payer method.

This improves the receiver-route-bound fallback hierarchy without changing final confirmation semantics.

