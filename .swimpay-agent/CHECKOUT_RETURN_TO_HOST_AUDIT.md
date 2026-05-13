# Checkout Return To Host Audit

Date: 2026-05-13

## Audited Surfaces

- Hosted checkout render and form-post redirects.
- Android SDK return scheme query handoff.
- Stored `return_url` exposure in checkout status.
- Final checkout CTA rendering.

## Findings

### Android Return Scheme

The Android SDK return scheme was accepted on the initial checkout URL, but intermediate hosted checkout form posts could drop the query parameter. That made the final screen fall back to the stored `return_url`.

### Web Return URL

The stored `return_url` is valid for web integrations, but it can point to an API receiver endpoint in external-app experiments. Rendering that URL as the final buyer CTA sends the buyer to a raw JSON-like response instead of the host app/site UX.

### Final CTA

The final CTA must be UX-only. It must never be used for fulfillment and must never mark an order paid.

## Classification

- Android return scheme preservation: partial.
- Web return fallback: partial.
- Raw API endpoint filtering: missing.
- Fulfillment separation: aligned.
