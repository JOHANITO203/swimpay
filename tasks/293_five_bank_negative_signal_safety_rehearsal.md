# Task 293 - Five-bank Negative Signal Safety Rehearsal

Status: completed

## Scope

Verify all negative synthetic categories remain blocked from auto-confirmation for every V1 bank:

- cashback
- refund
- outgoing/payment
- promo
- failed transfer
- amount-only

## Result

Runtime tests assert negative categories are rejected or sent to review as appropriate and never auto-confirm.
