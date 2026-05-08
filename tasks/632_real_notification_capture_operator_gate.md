# Task 632 - Real notification capture operator gate

Status: gated_not_started

Goal: keep real notification capture blocked until the final operator start command.

Allowed next step only after gate:
- one operator-owned supported-bank notification;
- one staging merchant;
- no customer data;
- manual review only.

Stop conditions:
- raw text crosses any boundary;
- unsupported package enters pipeline;
- Android attempts confirmation or webhook delivery;
- backend emits `payment.confirmed` before manual merchant confirmation.
