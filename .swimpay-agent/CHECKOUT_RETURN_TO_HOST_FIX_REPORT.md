# Checkout Return To Host Fix Report

Date: 2026-05-13

## Contract

Return target priority is now:

1. Valid Android SDK return scheme from checkout runtime context.
2. Safe stored web/custom `return_url`.
3. Browser-history fallback when no safe target exists.

## Implementation

- Preserved `swimpay_return_scheme` through hosted checkout form redirects.
- Added hidden return-scheme fields to buyer profile, receiver bank, receiving route, payer launcher, continue-to-bank and buyer-claim forms.
- Kept the launcher scheme separate from the return scheme.
- Added a checkout-safe return resolver before rendering final CTA links.
- Blocked unsafe or raw API-style buyer return links from being rendered as the final CTA.

## Fulfillment Boundary

The return CTA remains UX-only. External fulfillment still depends only on final signed webhooks after merchant manual decision.

## Tests

- Android scheme wins over stored web `return_url`.
- `android_return_scheme` alias is accepted.
- Web `return_url` works when no Android scheme exists.
- Raw API return endpoint is not rendered as buyer final destination.
- Missing target falls back safely.
