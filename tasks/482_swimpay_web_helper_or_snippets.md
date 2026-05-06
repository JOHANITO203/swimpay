# Task 482 - Web helper or snippets

Sprint: 9B - SDK Web Production Readiness

Goal:
Provide browser-safe checkout redirect ergonomics without exposing merchant secrets.

Acceptance:
- Add a tiny browser-safe redirect helper or documented snippet.
- The helper/snippet must only redirect/open an existing `checkout_url`.
- No order creation from browser with a secret key.
- Add static guardrail tests if docs/snippets are added.

Safety:
- Never put a SwimPay secret key in browser or Android code.
