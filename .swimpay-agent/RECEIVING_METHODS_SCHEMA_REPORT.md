# Receiving Methods Schema Report

Date: 2026-05-08

## Storage Model

The existing durable table remains `merchant_receiving_routes`. It is the internal storage table for merchant receiving methods.

Reason: checkout and payment-session flows already reference receiving routes by id. Reusing it avoids breaking payment intent selection while exposing a cleaner product API named `receiving-methods`.

## Additive Migration

Added:

- `packages/database/migrations/011_receiving_route_hmac_last4.sql`

The migration adds:

- `receiver_identifier_hmac TEXT`
- `receiver_identifier_last4 TEXT`
- partial unique index on `(merchant_id, rail_type, receiver_identifier_hmac)` where HMAC is not null.

## Stored Data

Stored:

- merchant id;
- bank id;
- method rail (`card_transfer` or `phone_transfer`);
- encrypted destination value;
- HMAC for deduplication/matching context;
- masked value;
- last4;
- active/default state.

Never stored as clear columns:

- raw card number;
- raw phone number;
- CVV;
- expiry date;
- PIN;
- SMS code;
- bank credentials.

## Public Response

The product API returns:

- `id`
- `type`
- `bank_id`
- `label`
- `masked_value`
- `last4`
- `status`
- `is_default`
- `official_bank_confirmation=false`

It does not return encrypted values, HMAC values or raw destinations.
