# Payment Compatibility Pair Contract Report

Date: 2026-05-10

## Contract Added

Added shared contract in `packages/contracts/src/index.ts`:

- `PaymentCompatibilityPair`
- `PaymentCompatibilityStatus`
- `PaymentCompatibilityFallbackStrategy`
- `CheckoutFallbackAction`
- `CheckoutUnavailableReason`

## Business Meaning

The pair separates:
- merchant receiver route: `receiving_route_id`;
- merchant receiver bank: `receiver_bank_id`;
- merchant receiver method: `receiver_method_type`;
- buyer method: `payer_method_type`;
- buyer sender bank: `sender_bank_id`;
- buyer launcher: `payer_bank_launcher_id`.

## V1 Compatibility

Allowed pairs:
- `card -> card`;
- `sbp -> sbp`.

Blocked pairs:
- `card -> sbp`;
- `sbp -> card`.

## Runtime Exposure

Checkout status responses can now expose:
- `available_payment_methods`;
- `available_routes`;
- `available_compatibility_pairs`;
- `fallback_actions`;
- `unavailable_reason`.

No raw PAN, raw phone, secrets or notification text are included.

