# apps/web AGENTS.md

This app owns hosted checkout and merchant dashboard.

Read before coding here:

- root `AGENTS.md`;
- `docs/13_UX_CHECKOUT.md`;
- `docs/14_UX_MERCHANT_DASHBOARD.md`;
- `docs/11_SECURITY_AND_PRIVACY.md`.

Rules:

- Never display raw phone numbers.
- Never display webhook secrets after creation.
- Never say "confirmed by bank" or equivalent.
- Checkout status must reflect backend state.
- `J’ai payé` never confirms payment.
