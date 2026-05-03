# Task 297 - Beta Order Checkout Review Flow

Status: completed

## Scope

Rehearse the private beta path:

order -> payment session -> checkout/status -> synthetic bank signal -> review queue.

## Result

Tests process each five-bank synthetic scenario through the signal runtime in review-only trust context. The result is `needs_review`, not auto-confirm.
