# Buyer Checkout Status Contract Report

generated_at: 2026-05-12T23:25:00+03:00

## Public Buyer Contract

Buyer-facing checkout code must consume a stable public state instead of interpreting internal review details.

## Mapping

| Backend state | Public checkout state | Buyer safe status |
| --- | --- | --- |
| `created`, incomplete selections | `buyer_identity` / selection step | `not_validated` |
| `payment_instructions_shown`, `awaiting_payment`, `receiver_armed` | `awaiting_payment` | `awaiting_payment` |
| `buyer_claimed_paid` | `buyer_claimed_paid` | `searching_signal` |
| `signal_detected`, `matching` | `signal_detected` | `signal_detected` |
| `needs_review` | `needs_review` | `needs_review` |
| `manual_confirmed`, `fulfilled` | `confirmed` | `confirmed` |
| `rejected` | `rejected` | `rejected` |
| `expired` | `expired` | `expired` |

## Buyer UI Rules

- `manual_confirmed` is not required knowledge for the buyer UI.
- public `buyer_safe_status=confirmed` is the stable confirmation signal for display.
- public `buyer_safe_status=rejected` is the stable rejection signal for display.
- `signal_detected` and `needs_review` are never confirmation.
- `J'ai payé` remains a buyer claim only.
- `official_bank_confirmation=false` remains present.

## Source Of Truth

- Backend: PostgreSQL order/payment session state.
- API: `/v1/checkout/:id/status` and `/v1/payment-sessions/:id`.
- Hosted web: `/checkout/:paymentSessionId/status`, proxying the current session state.
