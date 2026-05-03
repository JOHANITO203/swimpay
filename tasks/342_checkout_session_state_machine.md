# Task 342 - Checkout Session State Machine

## Goal

Extend checkout state handling for the PSP-like buyer journey while preserving SwimPay's Payment Signal Engine boundary.

## Required Buyer Flow States

- `receiver_bank_selection`
- `payer_bank_launcher_selection`
- `payment_instructions`
- `awaiting_payment`
- `buyer_claimed_paid`
- `signal_detected`
- `needs_review`
- `confirmed`
- `expired`
- `rejected`

## Requirements

- Add state mapping from internal payment session/order states to buyer-safe checkout states.
- Ensure `buyer_claimed_paid` does not confirm payment.
- Ensure `signal_detected` does not confirm payment.
- Ensure review-only real-bank signals route to review or controlled release policy.
- Write audit events for payment-related state transitions.
- Add state machine tests for allowed transitions, blocked confirmation shortcuts and expired/rejected handling.

## Safety Notes

- Never move directly from order creation to confirmed.
- `confirmed` in buyer UI can only reflect manual review or a separately controlled release path.
- Do not enable broad real-bank auto-confirmation.
