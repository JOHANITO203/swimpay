# Checkout Structured Error Handling Report

Date: 2026-05-10

## Problem

The hosted web provider previously converted backend failures into generic `API Error` exceptions. That made method availability failures look like server crashes.

## Fix

`ApiCheckoutSessionProvider` now preserves:
- HTTP status;
- backend error code;
- backend message;
- fallback details;
- `available_payment_methods`;
- `unavailable_reason`;
- `fallback_actions`.

## Web Behavior

For `409 no_receiving_route_for_method`, the checkout renders an actionable fallback:
- switch to available method;
- refresh methods;
- return to merchant.

The raw forced phone/card value is not reflected in the HTML.

## Tests

Added web tests proving:
- `session.available_payment_methods` is the primary source of truth;
- stale forced method POST renders fallback instead of a generic server error.

