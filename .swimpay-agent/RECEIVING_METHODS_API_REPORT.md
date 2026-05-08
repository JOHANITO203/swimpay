# Receiving Methods API Report

Date: 2026-05-08

## Product Endpoints

Implemented:

- `GET /v1/merchant/receiving-methods`
- `POST /v1/merchant/receiving-methods`
- `PATCH /v1/merchant/receiving-methods/:method_id`
- `POST /v1/merchant/receiving-methods/:method_id/disable`
- `POST /v1/merchant/receiving-methods/:method_id/set-default`

The authenticated merchant context supplies `merchant_id`. The frontend cannot choose another merchant id.

## Create Contract

Input:

- `type`: `card` or `phone`
- `value`: raw card/phone entry, create-only
- `bank_id`: supported bank id
- `label`: optional
- `is_default`: optional
- `status`: optional

Output:

- masked method only;
- no raw `value`;
- no encrypted payload;
- no HMAC.

## Validation

Server rejects:

- invalid card length;
- invalid Russian phone format;
- missing/unsupported type;
- missing bank id;
- nested or top-level credential fields: CVV, CVC, expiry, expiration, PIN, SMS code, password, bank password.

Duplicate destination HMAC for the same merchant and method rail returns `409 duplicate_receiving_method`.

## Compatibility

Legacy `/v1/merchant/receiving-routes` remains available for compatibility, but Android and web merchant surfaces now use `/v1/merchant/receiving-methods`.

## Web Surface Adapter

`ApiMerchantRouteAdminClient` now calls the product receiving-method API and maps returned product methods to the historical admin route shape used by the renderer.
