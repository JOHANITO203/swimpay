# Payment Compatibility Fallback Matrix Report

Date: 2026-05-10

## Implemented Fallbacks

### Merchant card only

Frontend shows card only.

Forced SBP submissions return structured `409`:
- `unavailable_reason=method_not_supported_by_merchant`;
- `fallback_actions=["switch_to_card","refresh_methods","return_to_merchant"]`.

### Merchant SBP only

Frontend shows SBP only.

Forced card submissions return structured method errors with switch/refresh/return actions.

### No active route

Checkout blocks before Step 1:
- `Paiement indisponible`;
- refresh action;
- return-to-merchant action.

### Route disabled before Step 3

`continue-to-bank` remains blocked when the selected route is no longer active or compatible.

### Launcher unavailable

Launcher unavailability remains a manual copy/paste fallback, not a payment incompatibility.

## Not Changed

- No auto-confirmation.
- No real notification capture.
- No public internal webhook exposure.
- No Android bank launcher runtime implementation.

