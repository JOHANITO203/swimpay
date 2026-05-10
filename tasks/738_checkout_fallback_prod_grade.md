# Task 738 — Checkout Fallback Prod-Grade Hardening

Status: pending

Objective: promote the current staging-safe checkout receiving-method fallback to a production-grade fallback surface.

Scope:
- add a contract-level `merchant_return_url` or `cancel_url` instead of relying on browser history;
- add metrics/traces for `no_receiving_route_for_method` and `no_receiving_methods_configured`;
- add SDK/order pre-check so external apps do not send buyers into checkout when the merchant has no active receiving route;
- verify route availability for card-only, phone-only, both-methods and no-methods merchants on staging mobile browser;
- decide final UX rule for unavailable methods: disabled visible option vs only available methods displayed;
- keep `payment.confirmed` manual-confirmation-only;
- keep `official_bank_confirmation=false`;
- do not expose raw PAN, raw phone, secrets or notification text.

Acceptance criteria:
- buyer always has a real merchant return path;
- unavailable checkout paths are observable without PII;
- SDK/order creation can fail early with a safe merchant configuration error;
- all fallback states have browser tests and API tests;
- no public webhook or payment confirmation is emitted by fallback behavior.
